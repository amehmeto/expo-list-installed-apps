package expo.modules.listinstalledapps

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.drawable.AdaptiveIconDrawable
import android.graphics.drawable.BitmapDrawable
import android.os.Build

import org.mockito.Mockito.*
import org.junit.Assert.*

import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mock
import org.mockito.junit.MockitoJUnitRunner

@RunWith(MockitoJUnitRunner::class)
class ExpoListInstalledAppsModuleTest {

    @Mock lateinit var mockContext: Context
    @Mock lateinit var mockAppInfo: ApplicationInfo
    @Mock lateinit var mockAdaptiveIconDrawable: AdaptiveIconDrawable

    private lateinit var module: ExpoListInstalledAppsModule

    @Before
    fun setUp() {
        module = spy(ExpoListInstalledAppsModule())
        // Mock appContext.reactContext
        doReturn(mockContext).`when`(module).getContext()
    }

    @Test
    fun testGetBase64IconImage_adaptiveIconDrawable() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            `when`(mockAppInfo.loadIcon(any())).thenReturn(mockAdaptiveIconDrawable)
            `when`(mockAdaptiveIconDrawable.intrinsicWidth).thenReturn(10)
            `when`(mockAdaptiveIconDrawable.intrinsicHeight).thenReturn(10)
            // Bitmap.createBitmap is static, so we can't mock it easily, but we can check for no crash
            val result = module.getBase64IconImage(mockAppInfo)
            assertTrue(result.startsWith("data:image/png;base64,") || result.startsWith("data:image/png;base64"))
        }
    }

    @Test
    fun testCheckAndRequestPermission_noException() {
        // Should not throw
        module.checkAndRequestPermission()
    }

    @Test
    fun testDefinition_isDefined() {
        assertNotNull(module.definition())
    }

    @Test
    fun testCanOpenScheme_emptyReturnsFalse() {
        assertFalse(module.canOpenScheme(""))
    }

    @Test
    fun testCanOpenScheme_whitespaceReturnsFalse() {
        assertFalse(module.canOpenScheme("   "))
    }

    @Test
    fun testCanOpenScheme_nonEmptySwallowsRuntimeException() {
        // In plain JUnit (no Robolectric), Uri.parse and PackageManager calls
        // throw RuntimeException("Stub!"). The implementation must catch and
        // return false rather than propagate.
        assertFalse(module.canOpenScheme("instagram"))
    }

    @Test
    fun testPlatformCapabilities_androidShape() {
        val caps = module.platformCapabilities()
        assertEquals("android", caps["platform"])
        assertEquals(true, caps["canListInstalledApps"])
        assertEquals(true, caps["canCheckUrlScheme"])
        assertNull(caps["urlSchemeLimit"])
        assertEquals(false, caps["requiresSchemeDeclaration"])
        // requiresRuntimePermission depends on Build.VERSION.SDK_INT (returns 0
        // in test stubs, so expect false here).
        assertEquals(false, caps["requiresRuntimePermission"])
        assertEquals(false, caps["familyControlsAvailable"])
    }
}
