package expo.modules.listinstalledapps

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Rect
import android.graphics.drawable.AdaptiveIconDrawable
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.util.Base64
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.doReturn
import org.mockito.Mockito.mock
import org.mockito.Mockito.spy
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], manifest = Config.NONE)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class AppIconRenderingTest {
    private fun createModuleIn(context: Context): ExpoListInstalledAppsModule {
        val module = spy(ExpoListInstalledAppsModule())
        doReturn(context).`when`(module).getContext()
        return module
    }

    private fun createRedIconApp(context: Context, firstLabel: String, vararg laterLabels: String): ApplicationInfo {
        val app = spy(ApplicationInfo().apply { packageName = "example.app" })
        doReturn(ColorDrawable(Color.RED)).`when`(app).loadIcon(context.packageManager)
        doReturn(firstLabel, *laterLabels).`when`(app).loadLabel(context.packageManager)
        return app
    }

    private fun createAppWithIcon(context: Context, drawable: Drawable): ApplicationInfo {
        val app = mock(ApplicationInfo::class.java)
        doReturn(drawable).`when`(app).loadIcon(context.packageManager)
        return app
    }

    private fun assertOnDecodedIcon(uri: String, assertBitmap: (Bitmap) -> Unit) {
        val bytes = Base64.decode(uri.substringAfter(","), Base64.NO_WRAP)
        val bitmap = requireNotNull(BitmapFactory.decodeByteArray(bytes, 0, bytes.size))
        try {
            assertBitmap(bitmap)
        } finally {
            bitmap.recycle()
        }
    }

    @Test
    fun `repeated scans reuse the encoded icon while refreshing the label`() {
        val context = RuntimeEnvironment.getApplication()
        val module = createModuleIn(context)
        val app = createRedIconApp(context, "First label", "New label")
        val info = PackageInfo().apply {
            applicationInfo = app
            lastUpdateTime = 1L
        }

        val first = module.formatAppInfo(info, "Main")
        val second = module.formatAppInfo(info, "Other")

        assertEquals(first["icon"], second["icon"])
        assertEquals("New label", second["appName"])
        assertEquals("Other", second["activityName"])
        verify(app, times(1)).loadIcon(context.packageManager)
    }

    @Test
    fun `updating an application reloads its icon`() {
        val context = RuntimeEnvironment.getApplication()
        val module = createModuleIn(context)
        val app = createRedIconApp(context, "Example")
        val info = PackageInfo().apply {
            applicationInfo = app
            lastUpdateTime = 1L
        }

        module.formatAppInfo(info, "Main")
        info.lastUpdateTime = 2L
        module.formatAppInfo(info, "Main")

        verify(app, times(2)).loadIcon(context.packageManager)
    }

    @Test
    fun `changing Android resource configuration reloads the icon`() {
        val context = RuntimeEnvironment.getApplication()
        val module = createModuleIn(context)
        val app = createRedIconApp(context, "Example")
        val info = PackageInfo().apply { applicationInfo = app }

        module.formatAppInfo(info, "Main")
        RuntimeEnvironment.setQualifiers("+night")
        module.formatAppInfo(info, "Main")

        verify(app, times(2)).loadIcon(context.packageManager)
    }

    @Test
    @Config(sdk = [28])
    fun `legacy icons retain transparent corners and bounds on the PNG path`() {
        val context = RuntimeEnvironment.getApplication()
        val module = createModuleIn(context)
        val drawable = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.RED)
            bounds = Rect(3, 4, 23, 24)
        }

        val uri = module.getBase64IconImage(createAppWithIcon(context, drawable))

        assertTrue(uri.startsWith("data:image/png;base64,"))
        assertEquals(Rect(3, 4, 23, 24), drawable.bounds)
        assertOnDecodedIcon(uri) { bitmap ->
            assertEquals(0, Color.alpha(bitmap.getPixel(0, 0)))
            assertEquals(255, Color.alpha(bitmap.getPixel(48, 48)))
        }
    }

    @Test
    fun `adaptive icons keep their corners for the consumer to shape`() {
        val context = RuntimeEnvironment.getApplication()
        val module = createModuleIn(context)
        val drawable = AdaptiveIconDrawable(ColorDrawable(Color.RED), ColorDrawable(Color.TRANSPARENT))
        drawable.bounds = Rect(3, 4, 23, 24)

        val uri = module.getBase64IconImage(createAppWithIcon(context, drawable))

        assertEquals(Rect(3, 4, 23, 24), drawable.bounds)
        assertOnDecodedIcon(uri) { bitmap ->
            assertEquals(96, bitmap.width)
            assertEquals(96, bitmap.height)
            for ((x, y) in listOf(0 to 0, 95 to 0, 0 to 95, 95 to 95)) {
                assertEquals("corner ($x, $y) must remain opaque", 255, Color.alpha(bitmap.getPixel(x, y)))
            }
        }
    }
}
