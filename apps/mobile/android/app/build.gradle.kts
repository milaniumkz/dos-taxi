import com.flutter.gradle.tasks.FlutterTask
import java.io.FileInputStream
import java.util.Properties

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
val hasReleaseKeystore = keystorePropertiesFile.exists()
if (hasReleaseKeystore) {
    keystoreProperties.load(FileInputStream(keystorePropertiesFile))
}

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.dos.dos_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    flavorDimensions += "role"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "kz.milanium.dospassenger"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["usesCleartextTraffic"] =
            providers.gradleProperty("dosUsesCleartextTraffic").orElse("false").get()
    }

    productFlavors {
        create("passenger") {
            dimension = "role"
            applicationId = "kz.milanium.dospassenger"
            manifestPlaceholders["appLabel"] = "DOS TAXI"
        }

        create("driver") {
            dimension = "role"
            applicationId = "kz.milanium.dosdriver"
            manifestPlaceholders["appLabel"] = "DOS DRIVER"
        }
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
                storeFile = rootProject.file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
            }
        }
    }

    buildTypes {
        release {
            signingConfig = if (hasReleaseKeystore) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")
}

flutter {
    source = "../.."
}

tasks.withType<FlutterTask>().configureEach {
    val taskName = name.lowercase()
    val isRelease = taskName.contains("release")
    targetPath = when {
        taskName.contains("driver") -> if (isRelease) {
            "lib/main_driver_prod.dart"
        } else {
            "lib/main_driver_dev.dart"
        }
        taskName.contains("passenger") -> if (isRelease) {
            "lib/main_passenger_prod.dart"
        } else {
            "lib/main_passenger_dev.dart"
        }
        else -> targetPath ?: "lib/main_passenger_prod.dart"
    }
}
