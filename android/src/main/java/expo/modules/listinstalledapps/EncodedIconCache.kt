package expo.modules.listinstalledapps

import android.content.res.Configuration
import android.util.LruCache

internal data class IconCacheKey(
    val packageName: String,
    val lastUpdateTime: Long,
    val firstInstallTime: Long,
    val sourceDir: String?,
    val iconResource: Int,
    val configuration: Configuration,
)

internal class EncodedIconCache(maxBytes: Int = 2 * 1024 * 1024) {
    private val entries = object : LruCache<IconCacheKey, String>(maxBytes) {
        override fun sizeOf(key: IconCacheKey, value: String): Int = value.length * 2
    }

    fun getOrLoad(key: IconCacheKey, load: () -> String): String {
        entries.get(key)?.let { return it }
        // Encoding stays outside the cache lock so different apps can load in parallel.
        return load().also { icon ->
            if (icon != PLACEHOLDER_ICON) entries.put(key, icon)
        }
    }

    fun clear() = entries.evictAll()
}
