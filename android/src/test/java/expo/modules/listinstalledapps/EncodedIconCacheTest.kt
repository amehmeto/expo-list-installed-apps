package expo.modules.listinstalledapps

import android.content.res.Configuration
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], manifest = Config.NONE)
class EncodedIconCacheTest {
    private fun key(name: String) = IconCacheKey(name, 1, 1, "/app.apk", 1, Configuration())

    @Test
    fun `evicts the least recently used icon when encoded data reaches the byte limit`() {
        val cache = EncodedIconCache(maxBytes = 8)
        cache.getOrLoad(key("a")) { "aa" }
        cache.getOrLoad(key("b")) { "bb" }
        assertEquals("aa", cache.getOrLoad(key("a")) { error("a must be cached") })
        cache.getOrLoad(key("c")) { "cc" }

        assertEquals("aa", cache.getOrLoad(key("a")) { error("a was recently used") })
        assertEquals("reloaded", cache.getOrLoad(key("b")) { "reloaded" })
    }

    @Test
    fun `a failed icon load is retried on the next scan`() {
        val cache = EncodedIconCache()
        cache.getOrLoad(key("a")) { PLACEHOLDER_ICON }

        assertEquals("recovered", cache.getOrLoad(key("a")) { "recovered" })
    }

    @Test
    fun `clearing the cache releases all encoded icons`() {
        val cache = EncodedIconCache()
        cache.getOrLoad(key("a")) { "old" }
        cache.clear()

        assertEquals("new", cache.getOrLoad(key("a")) { "new" })
    }
}
