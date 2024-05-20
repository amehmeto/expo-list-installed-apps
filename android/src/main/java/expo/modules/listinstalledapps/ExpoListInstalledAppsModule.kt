package expo.modules.listinstalledapps

import android.content.Intent
import android.content.pm.ResolveInfo
import android.content.Context

import android.os.Build
import java.io.File
/*
import android.graphics.drawable.BitmapDrawable
import java.io.ByteArrayOutputStream
import android.graphics.Bitmap
import android.util.Base64*/

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

import android.util.Log

class ExpoListInstalledAppsModule : Module() {
  private var context: Context? = null

  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  override fun definition() = ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('ExpoListInstalledApps')` in JavaScript.
    Name("ExpoListInstalledApps")

    Function("listInstalledApps") {
        try {
            val context: Context = appContext.reactContext ?: throw IllegalStateException("Context is null")

            val pkgAppsList = context.packageManager?.getInstalledPackages(0)  ?: emptyList()

            val appList = mutableListOf<Map<String, String>>()

            for (packageInfo in pkgAppsList) {
                val appInfo = packageInfo.applicationInfo

                val label = appInfo.loadLabel(context.getPackageManager()).toString()
                val packageName = appInfo.packageName
                val versionName = packageInfo.versionName
                val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    packageInfo.longVersionCode.toInt()
                } else {
                    packageInfo.versionCode
                }
                val firstInstallTime = packageInfo.firstInstallTime
                val lastUpdateTime = packageInfo.lastUpdateTime
                val apkDir = appInfo.sourceDir
                val size = File(apkDir).length()
                val iconBase64 = ""

                /*          // Get the app icon as a Base64 encoded image
                          val icon = appInfo.loadIcon(context.packageManager)
                          val bitmap = (icon as BitmapDrawable).bitmap
                          val outputStream = ByteArrayOutputStream()
                          bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
                          val iconBase64 = Base64.encodeToString(outputStream.toByteArray(), Base64.DEFAULT)
          */

                appList.add(mapOf(
                        "packageName" to packageName,
                        "versionName" to versionName,
                        "versionCode" to versionCode.toString(),
                        "firstInstallTime" to firstInstallTime.toString(),
                        "lastUpdateTime" to lastUpdateTime.toString(),
                        "appName" to label,
                        "icon" to iconBase64,
                        "apkDir" to apkDir,
                        "size" to size.toString()
                ))

                Log.d("ListInstalledAppsModule", "Found app: $label with package: $packageName")
            }

            appList
      } catch (e: Exception) {
        Log.e("ListInstalledAppsModule", "Error listing installed apps", e)
      }
    }

    // Defines event names that the module can send to JavaScript.
    Events("onChange")

    // Defines a JavaScript function that always returns a Promise and whose native code
    // is by default dispatched on the different thread than the JavaScript runtime runs on.
    AsyncFunction("setValueAsync") { value: String ->
      // Send an event to JavaScript.
      sendEvent("onChange", mapOf(
        "value" to value
      ))
    }
  }
}
