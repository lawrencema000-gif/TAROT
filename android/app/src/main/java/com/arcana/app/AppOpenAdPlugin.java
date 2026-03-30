package com.arcana.app;

import android.app.Activity;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.appopen.AppOpenAd;

@CapacitorPlugin(name = "AppOpenAd")
public class AppOpenAdPlugin extends Plugin {
    private static final String TAG = "AppOpenAd";
    private static final long MAX_AD_AGE_MS = 4 * 60 * 60 * 1000; // 4 hours
    private AppOpenAd appOpenAd;
    private long adLoadTime = 0;
    private boolean isShowingAd = false;
    private boolean isLoading = false;

    @PluginMethod()
    public void load(PluginCall call) {
        String adUnitId = call.getString("adUnitId");
        if (adUnitId == null || adUnitId.isEmpty()) {
            call.reject("adUnitId is required");
            return;
        }

        if (isLoading) {
            call.resolve();
            return;
        }

        isLoading = true;
        Activity activity = getActivity();

        activity.runOnUiThread(() -> {
            AdRequest adRequest = new AdRequest.Builder().build();
            AppOpenAd.load(activity, adUnitId, adRequest,
                new AppOpenAd.AppOpenAdLoadCallback() {
                    @Override
                    public void onAdLoaded(AppOpenAd ad) {
                        appOpenAd = ad;
                        adLoadTime = System.currentTimeMillis();
                        isLoading = false;
                        Log.d(TAG, "App open ad loaded");
                        call.resolve();
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError loadAdError) {
                        appOpenAd = null;
                        isLoading = false;
                        Log.e(TAG, "App open ad failed to load: " + loadAdError.getMessage());
                        call.reject("Failed to load: " + loadAdError.getMessage());
                    }
                });
        });
    }

    @PluginMethod()
    public void show(PluginCall call) {
        if (appOpenAd == null) {
            call.reject("No ad loaded");
            return;
        }

        // Discard ads older than 4 hours (AdMob best practice)
        if (System.currentTimeMillis() - adLoadTime > MAX_AD_AGE_MS) {
            appOpenAd = null;
            adLoadTime = 0;
            Log.w(TAG, "App open ad expired (>4h), discarding");
            call.reject("Ad expired");
            return;
        }

        if (isShowingAd) {
            call.reject("Ad already showing");
            return;
        }

        Activity activity = getActivity();

        activity.runOnUiThread(() -> {
            appOpenAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                @Override
                public void onAdDismissedFullScreenContent() {
                    appOpenAd = null;
                    isShowingAd = false;
                    Log.d(TAG, "App open ad dismissed");
                    call.resolve();
                }

                @Override
                public void onAdFailedToShowFullScreenContent(AdError adError) {
                    appOpenAd = null;
                    isShowingAd = false;
                    Log.e(TAG, "App open ad failed to show: " + adError.getMessage());
                    call.reject("Failed to show: " + adError.getMessage());
                }

                @Override
                public void onAdShowedFullScreenContent() {
                    isShowingAd = true;
                    Log.d(TAG, "App open ad shown");
                }
            });

            appOpenAd.show(activity);
        });
    }

    @PluginMethod()
    public void isLoaded(PluginCall call) {
        boolean isValid = appOpenAd != null
            && (System.currentTimeMillis() - adLoadTime <= MAX_AD_AGE_MS);
        if (appOpenAd != null && !isValid) {
            appOpenAd = null;
            adLoadTime = 0;
        }
        call.resolve(new com.getcapacitor.JSObject().put("loaded", isValid));
    }
}
