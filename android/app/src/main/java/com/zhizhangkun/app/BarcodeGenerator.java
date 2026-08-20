package com.zhizhangkun.app;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import java.util.HashMap;
import java.util.Map;

/**
 * 輕量級 Code 39 條碼生成器 (專門繪製台灣發票載具條碼，免第三方庫)
 */
public class BarcodeGenerator {

    private static final Map<Character, String> CODE39_PATTERNS = new HashMap<>();

    static {
        CODE39_PATTERNS.put('0', "000110100");
        CODE39_PATTERNS.put('1', "100100001");
        CODE39_PATTERNS.put('2', "001100001");
        CODE39_PATTERNS.put('3', "101100000");
        CODE39_PATTERNS.put('4', "000110001");
        CODE39_PATTERNS.put('5', "100110000");
        CODE39_PATTERNS.put('6', "001110000");
        CODE39_PATTERNS.put('7', "000100101");
        CODE39_PATTERNS.put('8', "100100100");
        CODE39_PATTERNS.put('9', "001100100");
        CODE39_PATTERNS.put('A', "100001001");
        CODE39_PATTERNS.put('B', "001001001");
        CODE39_PATTERNS.put('C', "101001000");
        CODE39_PATTERNS.put('D', "000011001");
        CODE39_PATTERNS.put('E', "100011000");
        CODE39_PATTERNS.put('F', "001011000");
        CODE39_PATTERNS.put('G', "000001101");
        CODE39_PATTERNS.put('H', "100001100");
        CODE39_PATTERNS.put('I', "001001100");
        CODE39_PATTERNS.put('J', "000011100");
        CODE39_PATTERNS.put('K', "100000011");
        CODE39_PATTERNS.put('L', "001000011");
        CODE39_PATTERNS.put('M', "101000010");
        CODE39_PATTERNS.put('N', "000010011");
        CODE39_PATTERNS.put('O', "100010010");
        CODE39_PATTERNS.put('P', "001010010");
        CODE39_PATTERNS.put('Q', "000000111");
        CODE39_PATTERNS.put('R', "100000110");
        CODE39_PATTERNS.put('S', "001000110");
        CODE39_PATTERNS.put('T', "000010110");
        CODE39_PATTERNS.put('U', "110000001");
        CODE39_PATTERNS.put('V', "011000001");
        CODE39_PATTERNS.put('W', "111000000");
        CODE39_PATTERNS.put('X', "010010001");
        CODE39_PATTERNS.put('Y', "110010000");
        CODE39_PATTERNS.put('Z', "011010000");
        CODE39_PATTERNS.put('-', "010000101");
        CODE39_PATTERNS.put('.', "110000100");
        CODE39_PATTERNS.put(' ', "011000100");
        CODE39_PATTERNS.put('*', "010010100"); // 起始/終止符
        CODE39_PATTERNS.put('$', "010101000");
        CODE39_PATTERNS.put('/', "010100010");
        CODE39_PATTERNS.put('+', "010001010");
        CODE39_PATTERNS.put('%', "000101010");
    }

    public static Bitmap generateCode39(String text, int width, int height) {
        if (text == null || text.isEmpty()) {
            text = "/AB1234+";
        }
        text = text.trim().toUpperCase();
        String fullText = "*" + text + "*";

        // 計算總模組寬度
        int narrowWidth = 3;
        int wideWidth = 7;
        int gapWidth = 3;

        int totalWidth = 0;
        for (int i = 0; i < fullText.length(); i++) {
            char c = fullText.charAt(i);
            String pattern = CODE39_PATTERNS.get(c);
            if (pattern != null) {
                for (char b : pattern.toCharArray()) {
                    totalWidth += (b == '1') ? wideWidth : narrowWidth;
                }
                totalWidth += gapWidth;
            }
        }

        int targetWidth = Math.max(width, totalWidth + 40);
        int targetHeight = Math.max(height, 100);

        Bitmap bitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        canvas.drawColor(Color.WHITE);

        Paint paint = new Paint();
        paint.setColor(Color.BLACK);
        paint.setStyle(Paint.Style.FILL);

        float startX = (targetWidth - totalWidth) / 2.0f;
        float currentX = Math.max(startX, 10);

        for (int i = 0; i < fullText.length(); i++) {
            char c = fullText.charAt(i);
            String pattern = CODE39_PATTERNS.get(c);
            if (pattern != null) {
                for (int bIdx = 0; bIdx < pattern.length(); bIdx++) {
                    boolean isBar = (bIdx % 2 == 0);
                    boolean isWide = pattern.charAt(bIdx) == '1';
                    float w = isWide ? wideWidth : narrowWidth;

                    if (isBar) {
                        canvas.drawRect(currentX, 10, currentX + w, targetHeight - 10, paint);
                    }
                    currentX += w;
                }
                currentX += gapWidth;
            }
        }

        return bitmap;
    }
}
