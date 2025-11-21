###############################################################################
# 🔥 REQUIRED RULES – FIX R8 CRASH FOR RELEASE BUILD
###############################################################################

# VisionCamera
-keep class com.mrousavy.camera.** { *; }
-keepclassmembers class com.mrousavy.camera.** { *; }

# MLKit OCR (safe, does NOT re-add translate)
-keep class com.google.mlkit.** { *; }
-keep interface com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# React Native Core + Hermes
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.hermes.**
-dontwarn com.facebook.react.**

# Reanimated
-keep class com.swmansion.reanimated.** { *; }
-dontwarn com.swmansion.reanimated.**

# JSI / TurboModules (Required for Vision Camera)
-keep class com.swmansion.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Keep JNI native methods
-keepclasseswithmembers class * {
    native <methods>;
}

# Stop warnings for annotations
-keep class androidx.annotation.** { *; }
-dontwarn javax.annotation.**

###############################################################################
