package expo.modules.listinstalledapps

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.Uri
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Build
import android.util.Base64
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.concurrent.Callable
import java.util.concurrent.Executors


private fun ResolveInfo.isSystemApp(): Boolean =
    (activityInfo.applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) == ApplicationInfo.FLAG_SYSTEM

class ExpoListInstalledAppsModule : Module() {
    private var context: Context? = null

    private companion object {
        private const val PERMISSION_REQUEST_CODE = 100
        private const val UNIQUE_BY_PACKAGE = "package"

        /**
         * Icons are rasterised into this box instead of the drawable's intrinsic
         * size, which reaches 432px on a high-density device. Consumers show
         * these in list rows, so 96px still covers a 32dp slot on a 3x display.
         * Cost falls with the pixel count across every stage: rasterise,
         * compress, Base64-encode, cross the bridge, and decode in JS.
         */
        private const val ICON_SIZE_PX = 96

        /** Lossy quality for the icon encode. Imperceptible at 96px. */
        private const val ICON_QUALITY = 80

        /** Bounds on the icon worker pool: enough to use the cores, not enough to thrash. */
        private const val MIN_ICON_WORKERS = 2
        private const val MAX_ICON_WORKERS = 8
    }

    fun getContext(): Context {
        return appContext.reactContext ?: throw IllegalStateException("Context is null")
    }

    /**
     * WEBP encodes an icon several times faster than PNG and yields a far
     * smaller payload. It needs API 30; older devices keep PNG. Format and MIME
     * type are returned together so the data URI can never disagree with the
     * bytes it carries.
     */
    private fun iconEncoding(): Pair<Bitmap.CompressFormat, String> =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            Bitmap.CompressFormat.WEBP_LOSSY to "image/webp"
        } else {
            Bitmap.CompressFormat.PNG to "image/png"
        }

    fun getBase64IconImage(appInfo: ApplicationInfo): String {
        var bitmap: Bitmap? = null
        try {
            val context: Context = getContext()
            val icon = appInfo.loadIcon(context.packageManager)

            // Draw straight into the target box. A Drawable scales itself to its
            // bounds, so an adaptive icon never allocates its full intrinsic
            // bitmap, and every drawable type works — the previous `when` fell
            // back to the placeholder for anything that was neither a
            // BitmapDrawable nor an AdaptiveIconDrawable.
            bitmap = Bitmap.createBitmap(ICON_SIZE_PX, ICON_SIZE_PX, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            icon.setBounds(0, 0, ICON_SIZE_PX, ICON_SIZE_PX)
            icon.draw(canvas)

            val (format, mimeType) = iconEncoding()
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(format, ICON_QUALITY, outputStream)
            // NO_WRAP: the default inserts a newline every 76 characters, which
            // is dead weight in a data URI.
            val iconBase64 = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)

            return "data:$mimeType;base64,$iconBase64"
        } catch (e: Exception) {
            // Callers are promised a usable data URI, never an exception, so the
            // log must not be able to break that promise: android.util.Log is
            // stubbed in plain JUnit and itself throws RuntimeException("Stub!").
            try {
                Log.e("ListInstalledAppsModule", "Error generating iconBase64", e)
            } catch (_: RuntimeException) {
                // Ignored: only happens in non-Robolectric unit tests.
            }
            return PLACEHOLDER_ICON
        } finally {
            bitmap?.recycle()
        }
    }

    fun getVersionCode(packageInfo: PackageInfo): Long {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            packageInfo.longVersionCode
        } else {
            packageInfo.versionCode.toLong()
        }
    }

    fun checkAndRequestPermission() {
        try {
            val context: Context = getContext()

            // Check if QUERY_ALL_PACKAGES permission is granted
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.QUERY_ALL_PACKAGES) != PackageManager.PERMISSION_GRANTED) {
                    val currentActivity = appContext.currentActivity
                        ?: throw IllegalStateException("Activity is null")

                    // Request the permission
                    ActivityCompat.requestPermissions(
                            currentActivity,
                            arrayOf(Manifest.permission.QUERY_ALL_PACKAGES),
                            PERMISSION_REQUEST_CODE
                    )
                }
            }
        } catch (e: Exception) {
            Log.e("ExpoListInstalledApps", "Error checking and requesting permission", e)
        }
    }


    fun canOpenScheme(scheme: String): Boolean {
        val trimmed = scheme.trim().removeSuffix("://")
        if (trimmed.isBlank()) return false
        return try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("$trimmed://"))
            getContext().packageManager.resolveActivity(intent, 0) != null
        } catch (e: RuntimeException) {
            // android.util.Log is stubbed in plain JUnit and itself throws
            // RuntimeException("Stub!"); keep the log inside its own guard so
            // it doesn't escape and break the swallow contract.
            try {
                Log.w("ExpoListInstalledApps", "canOpenScheme failed for '$scheme'", e)
            } catch (_: RuntimeException) {
                // Ignored: only happens in non-Robolectric unit tests.
            }
            false
        }
    }

    fun platformCapabilities(): Map<String, Any?> = mapOf(
        "platform" to "android",
        "canListInstalledApps" to true,
        "canCheckUrlScheme" to true,
        "urlSchemeLimit" to null,
        "requiresSchemeDeclaration" to false,
        "requiresRuntimePermission" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R),
        "familyControlsAvailable" to false,
    )

    fun queryInstalledApps(type: String, uniqueBy: String): List<Map<String, Any>> {
        val context: Context = getContext()
        checkAndRequestPermission()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R &&
            context.checkSelfPermission(Manifest.permission.QUERY_ALL_PACKAGES) != PackageManager.PERMISSION_GRANTED
        ) {
            Log.d("ExpoListInstalledApps", "QUERY_ALL_PACKAGES permission not granted")
        }

        val launcherIntent = Intent(Intent.ACTION_MAIN, null).addCategory(Intent.CATEGORY_LAUNCHER)
        var pkgAppsList: List<ResolveInfo> =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.queryIntentActivities(
                    launcherIntent,
                    PackageManager.ResolveInfoFlags.of(0L)
                )
            } else {
                context.packageManager.queryIntentActivities(launcherIntent, 0)
            }

        // null means "all": keep every launcher entry whatever its system flag.
        val wantSystemApps: Boolean? =
            if (type == "system") true else if (type == "user") false else null
        if (wantSystemApps != null) {
            pkgAppsList = pkgAppsList.filter { it.isSystemApp() == wantSystemApps }
        }

        val seenPackages = mutableSetOf<String>()
        val targets = mutableListOf<Pair<String, String>>()

        for (resolveInfo in pkgAppsList) {
            val packageName = resolveInfo.activityInfo.packageName
            val activityName = resolveInfo.activityInfo.name

            if (uniqueBy == UNIQUE_BY_PACKAGE && !seenPackages.add(packageName)) {
                continue
            }
            targets.add(packageName to activityName)
        }

        // Rasterising and encoding an icon is CPU-bound and independent per app,
        // so it spreads across cores. invokeAll preserves the input order, and a
        // package uninstalled mid-scan drops that one entry instead of failing
        // the whole call.
        val workers = Runtime.getRuntime().availableProcessors()
            .coerceIn(MIN_ICON_WORKERS, MAX_ICON_WORKERS)
        val pool = Executors.newFixedThreadPool(workers)
        val appList = try {
            pool.invokeAll(
                targets.map { (packageName, activityName) ->
                    Callable {
                        // Flag 0, not GET_META_DATA: the metadata bundle is never
                        // read and inflates every binder transaction.
                        val packageInfo = context.packageManager.getPackageInfo(packageName, 0)
                        formatAppInfo(packageInfo, activityName)
                    }
                }
            ).mapNotNull { future ->
                try {
                    future.get()
                } catch (e: Exception) {
                    Log.w("ExpoListInstalledApps", "Skipping an app that could not be read", e)
                    null
                }
            }
        } finally {
            pool.shutdown()
        }

        return appList
    }

    fun formatAppInfo(packageInfo: PackageInfo, activityName: String): Map<String, Any> {
        val context: Context = getContext()

        val appInfo = packageInfo.applicationInfo ?: throw IllegalStateException("ApplicationInfo is null")
        val label = appInfo.loadLabel(context.getPackageManager()).toString()
        val packageName = appInfo.packageName
        val versionName = packageInfo.versionName ?: "Unknown"
        val versionCode = getVersionCode(packageInfo)
        val firstInstallTime = packageInfo.firstInstallTime
        val lastUpdateTime = packageInfo.lastUpdateTime
        val apkDir = appInfo.sourceDir ?: "Unknown"
        val size = if (apkDir != "Unknown") File(apkDir).length() else 0L

        val iconBase64 = getBase64IconImage(appInfo)

        val appInfoFormatted = mapOf(
                "packageName" to packageName,
                "versionName" to versionName,
                "versionCode" to versionCode,
                "firstInstallTime" to firstInstallTime,
                "lastUpdateTime" to lastUpdateTime,
                "appName" to label,
                "icon" to iconBase64,
                "apkDir" to apkDir,
                "size" to size,
                "activityName" to activityName
        )

        return appInfoFormatted
    }

    // Each module class must implement the definition function. The definition consists of components
    // that describes the module's functionality and behavior.
    // See https://docs.expo.dev/modules/module-api for more details about available components.
    override fun definition() = ModuleDefinition {
        // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
        // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
        // The module will be accessible from `requireNativeModule('ExpoListInstalledApps')` in JavaScript.
        Name("ExpoListInstalledApps")

        AsyncFunction("listInstalledApps") { type: String, uniqueBy: String ->
            try {
                queryInstalledApps(type, uniqueBy)
            } catch (e: Exception) {
                Log.e("ExpoListInstalledApps", "Error listing installed apps", e)
                emptyList<Map<String, String>>()
            }
        }

        AsyncFunction("canOpenApp") { scheme: String ->
            canOpenScheme(scheme)
        }

        AsyncFunction("getPlatformCapabilities") {
            platformCapabilities()
        }

        AsyncFunction("requestFamilyControlsAuthorization") {
            false
        }

        Function("getFamilyControlsAuthorizationStatus") {
            "unavailable"
        }
    }
}
