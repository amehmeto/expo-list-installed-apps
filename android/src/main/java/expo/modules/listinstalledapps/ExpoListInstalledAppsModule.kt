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
    private val PERMISSION_REQUEST_CODE = 100 // Define your permission request code here

    private companion object {
        private const val PLACEHOLDER_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAMAAADDpiTIAAAAA3NCSVQICAjb4U/gAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAAwBQTFRF////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACyO34QAAAP90Uk5TAAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+6wjZNQAAJfhJREFUGBntwQdgVeXdwOHffbMhYQUQwoaQgEnQorTWATKkbq1irSgqohYVRBHFrZ9aV2s/tVatn4BbHFi0KnWw3YIKIZKQsDeyE8glyc3/Q2vr4D03996c3Jz3nPM8AZwos1dudvOM76RnJGCuUHlF+Xd2lZUUb8OBAjhLdu9eub16ZeJG24qLS4qXluEoAZyj+6BBA9vhdptmz5q1AscI4AwdBg0a1BmvWDNr1qz1OEIAB+h87rl5eE3R88+vofEFaGzNho0YEMCLZO6zr+6mkQVoVIlDR5yWhndVvv7suzU0pgCNqNmYKw/C6zY//MhuGk+ARtNq3JUt8MHOhx/aTmMJ0Ejajr88A9+/lT/6ly00jgCNIuvaS5vg+8HeJ/60gcYQoBGkXj8xFd9PBe+7N0j8BYi/kx/qju9AK8a9SdwFiLeuD52KT++NcauIswTiK+WGqfn4LOT+IfBpiLgKEFeDHu+JL5zS0bOIpwTiSN3+ZGt8YWWOSJgnxE+A+Gn3wkB8dZs9fBNxo4ibwV8NxBeBgV8NJm4SiBN125MZ+CKSfp6aJ8RHgPg46IVB+CI3a/hm4iJAXOS824XohFaU7qioqCivqAhhroT09PSM9PSWPbsnEJ3VQ5cRDwHiod/brYlY6KvFJSUly6twk+Qeubm5fQ5NIGJbT/wctxhaIZEqevi0FrhWi9MeLpJIVQzFJYZXSUQqpw5vh+u1Gz61UiJSNRxXGFcrEaidM6oZHtFs1JxaiUDtOFzgbolAyY1d8JQuN5ZIBO7GeLdJ3b4cFsBzAsO+lLrdhuFGS50+ORmPOvkTqdNojHZmSOowbwgeNmSe1CF0JgYbGJTw1p+Nx529XsILDsRYh+6SsKofyMDzMh6olrB2HYqhum+SsObl49svf56Etak7Rmq+TMLZewm+712yV8JZ1hwTvSLhLM3H91/5SyWcVzDQGAnn2ab4fqTpsxLOGIxz2D6xtncUvp8ZtVes7TsMwzRfLtbW9MF3gD5rxNry5pjlVbFW1BGfRsdCsfYqRhkr1j5siU+rxTyxNhaD5O8TS2+k4bOQ+ppY2pePOeaJpckJ+Cypx8XSPIxxvlh6PoAvnCli6XwM0WKzWHknCV9YiW+Jlc0tMMMjYuWzdHx1aPKJWHkEI/QNiYWSNvjq1LpYLIT6YoDAJ2JhQ1d8Eei6QSx8EsD5LhEL1Ufji8jR1WLhEhwvZb1YmIgvQhPFwvoUnO4ysfBWAF+EAm+JhctwuKRVorc2E1/EMteK3qoknG2k6FUfiS8KR1aL3kgcLWGZ6N2GLyq3id6yBJzsHNErTcEXlZRS0TsHBwsUit7x+KJ0vOgVBnCu34reNHxRmyZ6v8W53hWtik74otapQrTexbGyQqI1EV8MJopWKAunmiBaa5PxxSB5rWhNwKkWi9ZYfDEZK1qLcahDRGtTGr6YpG0SrUOwj8I+I9B6oBJfTCofQGsEjpSwQXS2peOLUfo20dmQgG0UthnSHp0HK/DFqOJBdNoPwYkmic6+Vvhi1mqf6EzCiVaLzjR89TBNdFbjQNmidTq+ejhdtLJxnktFZ1syvnpI3iY6l2IXhV0Go/NSFb56qHoJncE4TmCL6ByBr16OEJ0tAZzmENEpw1dPZaJzCDZR2GQQOu/gq6d30BmETRQ2GYzOTHz1NBOdwTjNFtEItcJXTy1DorEFh2kpOgvx1dsC0WmJPRT2yEFnJr56m4lODvZQ2CMXnVn46m0mOrnYQ2GPXDTkA3z19qGgkYs9FPbIRWNdBb5627MWjVzsobBHLhol+GxQgkYu9kjEFiobjRKc7bABOdk7S4tf34mjlRzHgbJVLQ7SVXTG4mS/nS//VvFId5xsjOh0xUmOEZ3jcK6UZ+QHu07AwY4TnWNwkhNFpzOO1fJD+bGaK3CuzqJzIk7yO9GoCeBYL8hP1RyJYwVqRON32EJhiww09ghO9dtz+KmEZ9NxKtmDRga2UNgiA41ynCr1EX6u+004VjkaGdhCYYsMNCpwqouzOMCYTJyqAo0MbKGwRQYaFThU8kQOlH4NTlWBRga2UNgiA41yHGpkRzTGZuJQ5WhkYAuFLdLRqMCZEq9HJ308DlWBRjq2UNiiKRp7caYRXdEa2wpn2otGU2yhsIVCQ3CkhBvRy7gGZxI0FLZQeM452VgY2wrPUXiNugkrGePxHIXXnNULS2Nb4jUKjwncjLVm4/Eahcecnk8YV7bEYxQecwvhNLsaj1F4y8m/IKwrW+AtCm+5hfCaX423KDzlN7+kDuNa4CkKT7mFujS/Ck9ReMnAo6jTVc3xEoWX3Erdml+Flyg85OhjicBVzfEQhYfcQiRajMNDFN7xq6FE5OrmeIfCO24hMi2uxDsUntH3JCJ0dTM8Q+EZtxCpllfiGQqvKDiNiI1vhlcovOLmABFrORavUHhE72FEYXwGHqHwiJsUUWg1Fo9QeEPP36P19DK0rsnAGxTecGMCOqE770Sr1Vi8QeEJ3c5D64XlLy5Da3w6nqDwhOsT0am9m9BdaGWOxRMUXtDpQrReKYYXStG6Jh0vUHjBxGR05C4gdCdamWPwAoUHtL8YrX8sYb8XStG6Jh0PUHjAdSlo3cW3Qneh1foKPEDhfm0vRevNL/nO86VoTWiK+ync75omaN3Jv4XuQqv1FbifwvUyL0frnc/43vNlaE1oiuspXO/qdLTu5D9Cd6HV5nJcT+F2LcaiNetD/uu5MrSubYLbKdxuXDO07uAHobvRanM5bqdwuYxxaM2fy488uwKta5vgcgqXG9MSrTv4sZo/otX2MlxO4W5Nx6P1yfv8xDMr0bquCe6mcLfLWqN1Bz9V80e02o7G3RSuljYBrYUz+JmnV6J1XRqupnC1Sw9C605+ruZutA4ajasp3CzlOrQWvcEBnl6F1nVpuJnCzS7KQusu4QDVd6PV7g+4mcLFkq5H6+tpaDy1Gq2JabiYwrVUtxs6o3WXoFH9R7TaPT16cBeFSyXiQgflfKtHCnrLXkLrqZu6oHPWWbBvRVlpWVnpmlpcJhE3yeiZm7NfM8L6Yy1a1Xf/HSspvXuzX9WKsrLSstI1IdwiEVdI7p7zrfZEYMULWJhyU2fCS+7Vi/2qV5aWlZaVrQphvETMFuiYk5uTk9M1gYjdU4OF6rsfJyJJOTnsV72qtKystGxVDeZKxFSZOd/qmUaU1jyNpSk3diYKST17sl/NqrLSsrLSVdUYKBHjNMnOzdmvFbG5txpLVfc8RvQSs7OPB0KryspKy0pXVmOSRMyR0C3nWx0D1MP6yYQx+cZOxCqhR4/fAKE1pWWlZWUrqjBCIiZon5Obk5PTPYn6u38fYVTd8yj1lNCt21Cgdk1pWdlXH1ThDdNFYyo2aDZs8sJysc2mNMJKXiN2Kn99EPU3VTSmYwuFo7WcvPWVkX3Tsc2fKgmr6l7slH7qzGfa4GQKJztt6cgk7LT1ceowaR32GrEgCwdTONhp0w7CXn/ZQx323YPNOv+rOc6lcK6jXkzAXjseoU6T1mOzgidwLoVjqSfTsNmD5dRp3z3Y7aw8HEvhWGf1wmZr/pcIPLEYmwVuxrEUjnUddruknAhUjwphs5MDOJXCqdIOxWZ3vEtEFlwawl7p3XEqhVMdrLDX9bcRocnDKrFXAU6lcKoe2OrLQfcRsem5z9RipxBOpXCqHdhnzf+ddthsorD2gh6XT19Vi13W4VSJONV6bLC3dNm3thO1VY89RnL3ntnZPbM7J1Bfa3CqRJxq9b4UYhdauexb64R6qCouZr/kbtk9s3tmd0kgVvO34VSJONWeacOJxcZl+5WsqMY2VSUl7JfULbtnds/sLolEbRKOlYhj/X04Udm9bNmykmWl5TSQ6mXL2C+xW3bP7OyeXROJ2PpXcKxEHGvejBOISNXyZSXLli3bTFzUlJbOABK7Zmf3zO7ZNYk6VZ+1F8dKxLnOXdiNsGRtybL9VoeIv5qyMvZL6NIzu+cRvyKc8R/jetNFYyr1dMhOCWdqGo6QVSzh3Ex9TRWN6dhC4WCLBm0njLP/ByfoNDeXMG64CydTONkXx24hjGsfovF1mZtNGBPuxdEUjlZ47EbCuPLxAI2s+9xuhHHVAzibwtmW9l9LGH+YrGhU2XO7YE3GPITDKRyurP9KwrjwuUQaUe7cjliT0X/D6RROt6p/KWGc81ISjebgOVlYq734CRxP4Xjr+n9NGGe8lkIjKZjTDmu1IyfjfArn23TsIsI4+Y00GsWhs9tgLTTiGQygMMA3gxYQxtC3m9IIDpuVibWa4S9gAoUJtg/5mDCOfacZcfer91tirfr3L2MEhRF2DZ1LGEe935I4O/LdFlirOmsaZlCYoeLE9wij36zWxNUx7zTD2r4zXscQCkPsPeUtwjh0zkHE0cAZ6VgLnv4WplCYYt8Z/yCMvLkdiJvj3mqKtcpT/oUxFMao+t1Uwsid24U4Of6NNKztOel9zKEwR815TxNGj3k9iIuTp6direLE2RhEYZDQyCcIo/PcXOLg9NdSsFZ+/DxMojCJjP4rYXSYm0+DG/ZKEtZ2HfchRlEYRa78E2EcNPtQGtg5UxOxtmPIp5hFYZjr7iSM1rP60aBGPJuAte2DF2AYhWluvYkwWr5/FA1o5FMJWNs66EtMozDO3RMIo9k7x9JgLp2ksLZl4CKMozDPA2MEa03fHkoDufzxANY2HbsE8ygM9LdLa7GW9sbJNIhxfwtgbcOApRhIYaInLwxhLeW1M2gAEx4kjHUDlmEihZGeHV6DtaSXzsF2N/yJMFYPKMNICjO9PKwKa4nPXYjNbr2bMFYOWIGZFIZ6/fQg1tTkP2CrO/+HMJYPWI2hFKaacfJerAUeH4uNbr2ZMJYNWIupFMaaeXw5YTx0GrY59XbCWHrseoylMNf8oTuxFni2FzZp/0wAa0UDN2IuhcE+GbwNaxn3YJMrm2Nt8cDNGExhsi8GbsHaab2xRdPRWPty0DeYTGG0wmM3YilwLrY4ogWWFgzehtEUZlvafy2WDsMWh2Hp0yE7MJvCcGX9V2KlD7bIxspHQ3dhOIXpVvUvxYJgi0oszP/NbkynMN66/l+jV4EtytGbc0IFxlOYb9Oxi9Dagi1Wo/X+iXswn8IFvhm0AJ0ibFGIzrxTKnEBhRtsH4dOEbYoEjRWBXEDhSvkoFOELcpXo1GAKyhcIQ+dIuxRiEbvBNxA4Qp5aGzdgj0K0UjNxg0UrpCHRhE2WYJOAW6gcIOMzmgUYZNCdApwA4UbHIxOETYpqUYjHzdQuEEeOkXYpLoYjQLcQOEGeegUYZclaPRIwwUUbpCHxpat2KUQDXUwLqBwgzw0irBNIToFuIDCBZp3RKMI2xSiU4ALKFzgYHSKsM2acjTycQGFC+ShU4RtZAkaBbiAwgXy0CnCPoVotM/EfAoXyENj03bsU4hOAeZTuEAeGkXYaAk6+ZhPYb4WWWgUYaNCdAown8J8eegUEYnEDCKxbSMaBZhPYb48dIqoS9KZb6wO7t6x8Pbu1KkQjTzMpzBfHjpFhJcyft2rp3ROoEXf28re+gV1WIJGsy4YT2G+PDQ27CSchItKH2jL9wInLnylF2EVolOA8RTmy0OjiHDOWDKpEz8SGLbkqa6EUYhOAcZTGK9VOzSKsDb4s2m9+JmEC0r+1h5LX9eikY/xFMbLQ6cIK4e/934/NJIvX35/JhYql6NRgPEUxstDpwi93Fc/H4KFtGtX3JqBXiEauUmYTmG8PHSK0On4ZNGZhNHsf1Zck4ZOIRrJOZhOYbw8NNbt5kCZfy4dlUB4rf9cNjqJAy1BpwDTKYyXh0YRB0i/ZcU1qdQt67HiEYqfK0SnANMpTNe6LRpF/Ezy2OV3NCMy3Z8pPIOfKQuikY/pFKbLQ6eIn1DnlzzclsgdPG3Bb/iJ0NdoFGA6heny0FnCj5266OmuROewf807mh9bgkbXdAynMF0eGrKUHwz46PV8onfM/Bl9+UEhGoF8DKcwXR4aa8r5j0NnzPk1sTl+wau9+Y9CdPIxnMJ0eWgU8b3sF784npgFzlzydDf+rRCdAgynMFzb1mgU8Z2sx5b+PkB9qPNL/taeb23YjkYBhlMYLg+dIvZreW/Z6ETqK+ny5fdnst8SNPIxnMJweegUQZPrV0xMww5p1664LQMK0WhzEGZTGC4PDVmadFnZPS2wS7PbV05IK0SnALMpDJeHxppTlz7aHjtl/qmsHzoFmC0Rw+Wh0eUFbJc1Cp18zKYwW7tW1Mvej6mfAsymMFs+9VH9WI8jB3xAfeQpjKYwWx6xkxd7X76Jecec+CWxa9INoynMlkfM3v7F8OV8a8ZhZxUTswKMpjBbHjH6qP9Ji/ievJp/4SpiVIDRFGY7mJgsOfWo+fxI6OncMRuJST5GUxitQwtisOr8Q/7Jz1T9rcfE7cSgAKMpjJZH9LZcmftsLQeqvL/bHeVErWcKJlMYLY9o7b61x1+r0Nt9W/cHgkQpsTcmUxgtj+gEH+h+ZwXWtk7o8Xg10cnHZAqj5RGN0KSeE7YR3obLej1bSzQKMJnCaAcThWn5F6+jbivOL3iNKBRgMoXJOjUjYjN/OayYyHx9Zr93iFg+JlOYLI9ILThuyOdEbsHxAz4gQp1aYDCFyfKITMmwfu8TnXnHnPgFkcnHYAqT5RGJdRfnTSN6Mw4/q5hI5GMwhckOpm7bJvScFCIW8mr+hauoW3cMpjBZJnXZc1f3B4LEKvR07hUbqUtXDKYwWRLhVT3S45bd1EfVoz0mbie8RAymMFkS4dQ+12vsZuqr8v5ud5QTzkIMpjDZ14Txz0NHrMQOu2/r/kAQawswmMJks7E0/+hTC7HL1gk9Hq/GykIMpjDZe1hYdFL/D7HThst6PVuL1kdbMZjCZJ//E53l5/7ibey24vyC19AIjsJkCqONr+IAm67o/YLQAL4+s987HOCmYnxMF42pNLyLQ/JTO25oQgPqP19+6j1Fg5sqGtNxkumiMZU4OK9GfmTvfS1pYCcslB8Er0+g4U0Vjek4yXTRmEo8HPux/Ef137NoeIFhn8v3Ps8jHqaKxnRskYjp5vz6+PF9M4EVU55eSxzIq6/mn5PTqWrBgs/LBNMlYr5//Yu2ObtX7yJultyEWyTiClu24IuJwudpClsIvjgTbKGwxT40kvHZIhmNfdhCYYtyNDLw2SIDjXJsobBFORrp+GyRjkY5tlDYogKNdHy2SEejAlsobFGORgY+W2SgUY4tFLYoRyMdny3S0SjHFgpblKORjs8W6WiUYwuFLcrRSGmBzwYtUtAoxxYKW5Sjk4vPBrnolGMLhS22opOLzwa56GzFFgpblAkaufhskItGbSm2UNiicg0aufhskIvG6iC2UNhjGRq5+GyQi0YJ9lDYowSNngpfvameaBRjD4U9StBIKcBXbwUpaJRgD4U9lqEzCF+9DUKnGHso7FGCzmB89TYYnWKcJbBXNHYn4qunxN2isQubKOwhRWhk9MNXT/0y0CjEJgqbzEZnML56GozObGyisMksdIbgq6ch6MzGaZpWiUZNe3z10r5GNCpTsYnCJns+QSNhOL56GZ6AxsdBbKKwy0x0RuCrlxHozMJ5jhGtAnz1UCBaR+I8SRWicz++erhfdMqTcKAZorNe4YuZWi86M7CNwjZvoJN1Cr6YnZKFzhs4Uat9ovMZvph9Jjr7WuFI/xCtofhiNFS0/oEznSFa8/HFaL5onYEzJW8XrQH4YjJAtLYn41CPidZ7+GLynmg9hlMdKXr98cWgv+gdiWOViVZhIr6oJRaKVhl2UtjpKbTyx+GL2rh8tJ7CuVruFq3dHfBFqcNu0drdEge7V/Sm4ovSVNG7Fydru0f0huCLyhDR29MWR3tQ9FY0xxeF5itE70GcrUNQ9Kbhi8I00Qt2wOEeFwtX4ovYlWLhcZyua7Xo7euHL0L99oledVcc70mxsLIFvoi0WCkWnsT52mwXC28ofBFQb4iF7W0wwGVi5TF8EXhUrFyGCdQCsXI7vjrdLFYWKIzQLyRWRuOrwyixEuqHIR4XK6Ez8IV1So1YeRxTtPpGrASH4gvj2L1i5ZtWGOMisbTv9/gsDQuKpYswR+BNsVQ7Dp+FK0Ji6c0ABslcI9buwad1l1hbk4lRjqwWa5MT8R0gcZJYqz4Sw1wrYcxpj+9n2s+RMK7FNIF/Shibj8P3E8dtljD+GcA4rVZLGKE7EvD9V8IdIQljdSsM9OsqCWd2e3zfaz9bwqn6NUa6SMLaOiqAb7/AqK0S1kUY6gYJ76ND8XHoRxLeDRjrQQmv5uHmeFzzh2skvAcxV+AFqcOmixLxsMSLNkkdXghgsKR3pC4rR6fgUSmjV0pd3knCaOmfSZ3WX9UED2py1Xqp02fpGK7NEqnb5ps64jEdb9osdVvSBuO1+lAiEJp5YQaekXHhzJBE4MNWuEDamxKRPc8fn4QHJB3//B6JyJtpuELiUxKhihnX9lW4mOp77YwKidBTibjFfRK5bdPG9D8IFzqo/5hp2yRy9xEPAeJi/J8DRGNXSUlx6fby8t3lFbWYTKVnNMvIaNWzV25uc6IhE/5CPASIj3OebEJMZG8NManduKLoqWLskHlRv+6dk4lBQtMAMdl78Yu4y8FF0gjeO4x6y3yyUuKt6GBcp8lT0giCo6inX66WuHuqCW40co80gpupl4H7JN72jMSl8r6W+AsNph7abpB4+zoP12o6ReJvUyaxe1PibUpT3GzQUom7h4nZiRJnSwfhckkTKyTOqnKIUUKRxFXFxCTcr9OrEmf/IEZ/kLh6tRPeMHSZxNcAYpKxSeJo2VA8I3n8RomnBQFicZfEz8bxyXhJ6hVrJI7OIwYd90q8rLkiFa9Jvni5xM2aVKL3jMTJ8ouT8aLEEUslXm4kan1rJS6WjkjEq9TJL1dKXOxuS7RmSxxUvnyywtOaXzyvVuLgMaJ0qjS42nkXN8dH15tLpMHVHExUEoulgZXc3BXf9/rdPDsoDestonKFNKTg7Jv74QgBnCLtqMGD+ybQcI57n8g1L2tNAwl9MXPmh5U4RAAnaTHgmF653RJoEIv61hKxeyfSAEIrS4rnz92JgwRwnKQeubm5OT2aN8FmF00hUl2KU7HT3l3Ll5WUlCyvxmkCOFZCesZ+6RmJRKn/SLQ29NxLhF44B62PnyAqNeUV5ftVhPDFT5N1oncbEfplrWjV/gKfAS4UvYr2RGa+6D2FzwTqS9GbRETOEL29HfEZYZDohfoQgaRS0bsTnyH+KXrvEoFxorcpHZ8heleL3gnUqcU20bsUnzEeFb0lCdTlz6K3JAGfMdrsEr0/UIfu+0TvBHwGuV70NmUQ3sui9y4+k6SuFr27COvXohfqg88ow0Vvb0fC+Uj0JuEzS+Az0XuGMH4nehVZ+AxzjOjV9sVS8grRux2fcV4TvdlYukb0NjTFZ5yeVaJ3KhZa7RC9UfgM9KDoFSei96DoLVL4DNRqh+iNQatnlegNxWeka0Tvm+bovCZ6M/CZKXm56N2PxjGiV5OPz1BniV6wKwcIfCZ6T+Az1oei9yIHGC565e3wGesI0av9FT+Tukr0bsFnsKmi9wE/M1H01jXBZ7BuQdEbxk+02SV6F+Iz2p9EryyZH3tE9L5U+IzWYqvoXc2P9KoWvUH4DDdW9La34gdviN6b+EyXVCJ6/8t/DRS9mt74jHea6FVl873AQtF7DJ8LzBG9aXzvfNHb3RafCxxWK3pH8520taJ3A9HJ75uf0xmf4zwrep8G+NZNorcmlShkXv21fGvz1Et64LOZ+tXtU155e+6T/QPEoNNe0TuH/Q7aLXrnEbnAffvkB6unjOiAzy5tznt+q3xv5R1pRO+PorcqBXhc9BYEiFjCZPm54keHZeKrL/Wr2z8NyY99lEnUMjaL3kTIqxG9AUQs6WXRqf3ygZMy8MWs9bnPfSMHWNqFqI0WvZ2teVv0phO5W8RS9ezRbfDF4JDbPw2J1rp0opVQJHqPDBG96lwilrJZwql+56KW+KJy0NVfibVriNqJolddJnp/JXKjpC5Vb45ohi9CKWf9s1rCWZ9M1N6TqOxsTeSWSAQqXzu7Kb66HfHYdqnLJUTtkJBE4zoi11QitOel36biC6fTjSUSgXeJ3iSJwqoUItdCIrfjvg74LKizZ4YkIp8SvawKidw5RKGtRKPqub74NJJGLpNIfU0MbpeIfRogCh0lSrNPCeD7qZTLVknk1hKDphskUkcTjaYVEq3i0Wn4ftB0/AaJxgpicZFEaBrRmSzR23pnO3z/1vzGbyQ69xELtUgiUpVNdI6SWAQnd8YHmXfulGjlEZMhEpEHiVaxxGTPjcl4XeDSnRK1L4jR2xKBHa2I1pEVEpuS4/C2nDkSvdApxOjgGqnbNURvcFBi9EpHvCvxhkqJwWXE7HGp0/JkYnBqtcSoYmISHnX4IonFncSu7W6py++ISbcHd0uMlg7Ci5o8UCMxWHsF9XGj1OEjYtX8mi9CEpupbfGc41ZIDEpHJVMvaWskvF9TD61++9ciicXqQ/GYmyRqtV/dOzCB+hohYb1MfR30+7+XStQqzsRLEv4uUfrmhQvaYYfAAgljX3fs0PH8KaslOrW3BvCMpm9KNKo/uLmfwi4DJIwHsE2PsfNCEo2Xm+ARbT+XyFU8f2ZzbDVdLG1riZ3aj5kbksgt7Ign5KyQSFW9ObwpdsupFivjsFv7K+aEJFIbj8ADjtwqkamdf1kmDeFhsVCaRANod8WckEQmeCquN6RSIrL4+i40kMydoncGDaTdjWslIpVH43KdvpEIVD3fjwZ0rWjNp+EkDpsrkdiRh6slfSx12/rHLBpUykrRqP0lDarPE3ukbus64WYPS52WXJJGQztbNF6kobWcsELq9Eki7nW21GXGccTDx3KAYFcanjpzqdTlLlyrV7mE99kA4uPXIfm5u4mLhIvXSXihAbhU0yUS1vKzA8TLHfIznyYRJ2kTd0hYazJwp79JOFvHJRM/CXPkJ7Z1IX5a3l8p4dyBK3WvEmuhB5oTV01flB/5uhdx1fEtCWNPe9zoabG25lji7orN8r2qSenE25hKsfYELtQrJJZeakEjSDnvXytrZMvHt7ajEeQtEks1XXGfR8TK7gtoNElNaSwpf6kVK7fjOklbxcLyHnjUyXvFwsoAbnOaWFiahWcNrBALg3Cbl0RvUVs87KhdovcobrNRtD5viaf9crtofYnLdBat3Z3wuN+IVk1T3GWYaF2G500WrQG4yx9FZ04Az2uxXnTGEBeKOGmLznWC5+28Hp02xIUiTjLRKF+Ij38JGpnEhSJOWqHxcQgf33yNRmviQhEnKWiswLdfKRopxIUiTtaicQi+/Q5BYy1xoYiTVWgcmoKPtt3QWEVcKOJkFRppY/FxHTqrcJcTRWdnazyv+z7R6Yu7HCxaU/A69ZZotcJdmojedXjcQ6K1C7dZJlq1Z+Np14jeXNzmBtELnoSHXVwrehfiNlk1oldzFV4VuE8s7GqC67whVv6ehCc1eU2sPIb7nCaWZnXAg7IXiqW+uE/iRrG04wK8Rl21RywtxI3ulTDe6oCnZM+XMEbjRq02SBg7LgrgGYlX75EwFifjSidJWF8OxSPOLJFwqvviUpMkvHcPxQOO/kjCux23arZawqt9tgsu13u61OHLJFxrcK3Uofq5vrjY0f8ISR329cHFHpG6zTopgCsl/O5TqdtNuFnquxKBpZek4joZV62UCLyYgKulzZJIfPPw4bhJ4Jj/2yWReDURl2s6TyJTNLEDLtHj9uUSmelJuF76RxKh0LvnNcF4zS+ZL5F6KxkPaPaZRKz8peEtMFibkdMrJWLvpOAJLT6XKFTPvLIrRsq99oOQROHdNDwi9e8SnUV3HIZZ1JH3FUtUau9OwDvOrZAorZ18fmcMkX3xc5slSltPwFN6L5HorZh8QRccruclz62T6H3QEY9p8pTEZOWUC7riUDmXPL9eYlF7fyKNI0DjueiRNGKzffGixYuLKnGO9Pw+h/QpaE5stl/wJo0kQCPq8b+nELtQ6eLFixetoZEFuvfpc0if7gFiJs9M3ExjCdCoTngwh/rZtXjx4kVL9tAYmvXZryCd+lk45hMaT4DGlXzVzRnUmyxfvGjx4pVCvKjsPof06dOV+tt646RaGlGAxtb+/nMD2KK8ZP2G72wTGkagbVZW+6ysrI65TbBF6LFbd9CoAjS+Ix86HFtVbdywYcPGDfvtwA6ZWd9rl4it5oxbTCML4ATHXz+ABlG5ccN3dgWDlcFgUIiMSk1NTUtNbZmV1T4rK6t9Cg3i7Xs+oNEFcIYjbjglQIPbFwwGK4PBymAwWBkMBiuDwcpgIDUtNTU1LTU1LTU1NS01NTUtNTWZBhd66b7FOEAApzh44vBEvCI45U8rcYQAztF5wqgmeMGuRx/ajEMEcJLW51+Uh9stmPz8bhwjgMP0G3lOC9xry3NTluAkARwn9bcjByvcqObtKW9V4ywBnKjTBSO74zZFU57bjOMEcKbAr047rTfu8dX017/CiQI4V85ppx+hMF/N3NdfX4NDBXC0tqecPiQVk5XPeP3tnThXAKdrOvTkQV0xU/HMN2dV4WgBTNBl4MCBnTBL2ezZszfheAFM0WPgsQOzMMOq2bNnr8MIAUySM/CYw3MCOFmo+PN5s1dhjACmadb38MMP74EDScmCBQu/3INRAhip5WGHH354FxxDli9YsOCLcswTwFytC3r36t2rI41K1ixdWry0cCeGCmC6jF69evfulZ1IvFWVLl1avLRkL0YL4A5J2d2zsrI6ZGW1UTSs0OYN31q/fEUIFwjgMontsrI6ZH2rFTaSbRs2rN/wrc0h3CSAa6VmfadDVlY6sdq14TvrN2yswp0CeEB607TUtNS01NS01LTUtNS01LTUtNS01NS01LTUNKkMVgYrg8HKYGWwMlgZrAxWBoOVwcpgZbCyYi9u9/9/9QZFwH/QsgAAAABJRU5ErkJggg=="
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


    fun formatAppInfo(packageInfo: PackageInfo): Map<String, String> {
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
                "size" to size.toString()
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

        AsyncFunction("listInstalledApps") { type: String ->
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

                for (resourceInfo in pkgAppsList) {
                    val packageInfo = context.packageManager.getPackageInfo(resourceInfo.activityInfo.packageName, PackageManager.GET_META_DATA)
                    val appInfoFormatted = formatAppInfo(packageInfo)
                    appList.add(appInfoFormatted)
                }

                return@AsyncFunction appList
            } catch (e: Exception) {
                Log.e("ExpoListInstalledApps", "Error listing installed apps", e)
            }
        }
    }
}
