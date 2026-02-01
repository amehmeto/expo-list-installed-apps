package expo.modules.listinstalledapps

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.AdaptiveIconDrawable
import android.graphics.drawable.BitmapDrawable
import android.os.Build
import android.util.Base64
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.io.File


class ExpoListInstalledAppsModule : Module() {
    private var context: Context? = null

    private companion object {
        private const val PERMISSION_REQUEST_CODE = 100
        private const val UNIQUE_BY_PACKAGE = "package"
    }

    fun getContext(): Context {
        return  appContext.reactContext ?: throw IllegalStateException("Context is null")
    }

    fun getBase64IconImage(appInfo: ApplicationInfo): String {
        try {
            val context: Context = getContext()
            val icon = appInfo.loadIcon(context.packageManager)

            val bitmap = when (icon) {
                is BitmapDrawable -> icon.bitmap
                is AdaptiveIconDrawable -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        Bitmap.createBitmap(icon.getIntrinsicWidth(), icon.getIntrinsicHeight(), Bitmap.Config.ARGB_8888).also {
                            val canvas = Canvas(it)
                            icon.setBounds(0, 0, canvas.width, canvas.height)
                            icon.draw(canvas)
                        }
                    } else {
                        throw IllegalArgumentException("Unsupported drawable type")
                    }
                }
                else -> throw IllegalArgumentException("Unsupported drawable type")
            }

            // Convert the bitmap to Base64 string
            val outputStream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
            val iconBase64 = Base64.encodeToString(outputStream.toByteArray(), Base64.DEFAULT)

            return "data:image/png;base64,$iconBase64"
        } catch (e: Exception) {
            Log.e("ListInstalledAppsModule", "Error generating iconBase64", e)
            return PLACEHOLDER_ICON
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


    fun formatAppInfo(packageInfo: PackageInfo, activityName: String): Map<String, String> {
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
                "versionCode" to versionCode.toString(),
                "firstInstallTime" to firstInstallTime.toString(),
                "lastUpdateTime" to lastUpdateTime.toString(),
                "appName" to label,
                "icon" to iconBase64,
                "apkDir" to apkDir,
                "size" to size.toString(),
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
                val context: Context = getContext()

                checkAndRequestPermission()

                // Check if QUERY_ALL_PACKAGES permission is granted
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    if (context.checkSelfPermission(Manifest.permission.QUERY_ALL_PACKAGES) != PackageManager.PERMISSION_GRANTED) {
                        Log.d("ExpoListInstalledApps", "QUERY_ALL_PACKAGES permission not granted")
                    }
                }

                // Log the current API level
                Log.d("ExpoListInstalledApps", "Current API level: ${Build.VERSION.SDK_INT}")

                val intent = Intent(Intent.ACTION_MAIN, null)
                intent.addCategory(Intent.CATEGORY_LAUNCHER)
                var pkgAppsList: List<ResolveInfo>

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    pkgAppsList = context.packageManager.queryIntentActivities(
                        Intent(Intent.ACTION_MAIN, null).addCategory(Intent.CATEGORY_LAUNCHER),
                        PackageManager.ResolveInfoFlags.of(0L)
                    )
                } else {
                    pkgAppsList = context.packageManager.queryIntentActivities(
                        Intent(Intent.ACTION_MAIN, null).addCategory(Intent.CATEGORY_LAUNCHER),
                        0
                    )
                }

                if (type.equals("system")) {
                    pkgAppsList = pkgAppsList.filter { packageInfo ->
                        (packageInfo.activityInfo.applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) == ApplicationInfo.FLAG_SYSTEM
                    }
                } else if (type.equals("user")) {
                    pkgAppsList = pkgAppsList.filter { packageInfo ->
                        (packageInfo.activityInfo.applicationInfo.flags and ApplicationInfo.FLAG_SYSTEM) != ApplicationInfo.FLAG_SYSTEM
                    }
                }

                val appList = mutableListOf<Map<String, String>>()
                val seenPackages = mutableSetOf<String>()

                for (resolveInfo in pkgAppsList) {
                    val packageName = resolveInfo.activityInfo.packageName
                    val activityName = resolveInfo.activityInfo.name

                    // Deduplicate by package name if uniqueBy is "package"
                    if (uniqueBy == UNIQUE_BY_PACKAGE && seenPackages.contains(packageName)) {
                        continue
                    }
                    seenPackages.add(packageName)

                    val packageInfo = context.packageManager.getPackageInfo(packageName, PackageManager.GET_META_DATA)
                    val appInfoFormatted = formatAppInfo(packageInfo, activityName)
                    appList.add(appInfoFormatted)
                }

                return@AsyncFunction appList
            } catch (e: Exception) {
                Log.e("ExpoListInstalledApps", "Error listing installed apps", e)
            }
        }
    }
}
