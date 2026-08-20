package com.zhizhangkun.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class QuickActionWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_action);

        // 語音記帳
        Intent voiceIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("zhizhangkun://voice"));
        voiceIntent.setClass(context, MainActivity.class);
        voiceIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent voicePending = PendingIntent.getActivity(
            context, 10, voiceIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_btn_voice, voicePending);

        // 掃描發票
        Intent scanIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("zhizhangkun://scan"));
        scanIntent.setClass(context, MainActivity.class);
        scanIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent scanPending = PendingIntent.getActivity(
            context, 11, scanIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_btn_scan, scanPending);

        // 記一筆
        Intent addIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("zhizhangkun://add"));
        addIntent.setClass(context, MainActivity.class);
        addIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent addPending = PendingIntent.getActivity(
            context, 12, addIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_btn_add, addPending);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, QuickActionWidgetProvider.class));
        for (int id : ids) {
            updateAppWidget(context, manager, id);
        }
    }
}
