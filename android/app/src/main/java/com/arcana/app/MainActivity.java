package com.arcana.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppOpenAdPlugin.class);

        // Enable edge-to-edge display (Android 15+ / SDK 35+ requirement)
        EdgeToEdge.enable(this);

        super.onCreate(savedInstanceState);

        // Make app content draw behind system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        WindowInsetsControllerCompat windowInsetsController =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());

        if (windowInsetsController != null) {
            windowInsetsController.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
            // Use light/dark status bar icons based on content
            windowInsetsController.setAppearanceLightStatusBars(false);
            windowInsetsController.setAppearanceLightNavigationBars(false);
        }
    }
}
