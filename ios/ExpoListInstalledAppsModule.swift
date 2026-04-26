import ExpoModulesCore

public final class ExpoListInstalledAppsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoListInstalledApps")

    AsyncFunction("listInstalledApps") { (_: String, _: String) -> [[String: Any]] in
      return []
    }
  }
}
