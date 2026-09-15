plugins {
    id("com.android.application")
}

android {
    namespace = "app.able.mobile"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.able.mobile"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
}

dependencies {
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.7.2")
}
