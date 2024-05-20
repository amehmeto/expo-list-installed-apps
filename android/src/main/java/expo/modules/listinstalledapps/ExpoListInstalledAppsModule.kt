package expo.modules.listinstalledapps

import android.content.Intent
import android.content.pm.ResolveInfo
import android.content.Context


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

        val mainIntent = Intent(Intent.ACTION_MAIN, null)
        mainIntent.addCategory(Intent.CATEGORY_LAUNCHER)


        val pkgAppsList: List<ResolveInfo> = context.packageManager?.queryIntentActivities(mainIntent, 0)  ?: emptyList()

        val appList = mutableListOf<Map<String, String>>()

        for (resolveInfo in pkgAppsList) {
          val appInfo = resolveInfo.activityInfo.applicationInfo
          val label = appInfo.loadLabel(context.getPackageManager()).toString()
          val packageName = appInfo.packageName
          appList.add(mapOf("label" to label, "packageName" to packageName))
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
