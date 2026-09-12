package expo.modules.listinstalledapps

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.drawable.AdaptiveIconDrawable
import android.graphics.drawable.BitmapDrawable

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
    fun testGetBase64IconImage_fallsBackToPlaceholderWithoutGraphics() {
        // Bitmap and Canvas are stubbed in plain JUnit and throw
        // RuntimeException("Stub!"), so this exercises the fallback path rather
        // than the encode path. The contract under test is that callers always
        // receive a usable data URI and never see an exception — including the
        // exception the logging call itself would raise here.
        `when`(mockAppInfo.loadIcon(any())).thenReturn(mockAdaptiveIconDrawable)

        val result = module.getBase64IconImage(mockAppInfo)

        assertEquals(PLACEHOLDER_ICON, result)
        assertTrue(result.startsWith("data:image/"))
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
