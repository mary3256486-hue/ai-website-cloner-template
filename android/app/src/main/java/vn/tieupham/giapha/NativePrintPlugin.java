package vn.tieupham.giapha;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {

    @PluginMethod
    public void printCurrent(PluginCall call) {
        String title = call.getString("title", "Gia phả");
        getActivity()
            .runOnUiThread(
                () -> {
                    try {
                        WebView webView = getBridge().getWebView();
                        PrintManager manager =
                            (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
                        manager.print(
                            title,
                            webView.createPrintDocumentAdapter(title),
                            new PrintAttributes.Builder().build()
                        );
                        call.resolve();
                    } catch (Exception error) {
                        call.reject(error.getMessage());
                    }
                }
            );
    }

    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html", "");
        String title = call.getString("title", "Gia phả");
        getActivity()
            .runOnUiThread(
                () -> {
                    try {
                        File file = new File(getContext().getCacheDir(), "pat-print.html");
                        try (FileOutputStream out = new FileOutputStream(file)) {
                            out.write(html.getBytes(StandardCharsets.UTF_8));
                        }
                        WebView webView = new WebView(getContext());
                        webView.getSettings().setAllowFileAccess(true);
                        webView.getSettings().setJavaScriptEnabled(false);
                        webView.setWebViewClient(
                            new WebViewClient() {
                                @Override
                                public void onPageFinished(WebView view, String url) {
                                    // chờ font/ảnh data-uri giải mã xong trước khi dựng trang in
                                    view.postDelayed(
                                        () -> {
                                            try {
                                                PrintManager manager =
                                                    (PrintManager) getContext()
                                                        .getSystemService(Context.PRINT_SERVICE);
                                                manager.print(
                                                    title,
                                                    view.createPrintDocumentAdapter(title),
                                                    new PrintAttributes.Builder().build()
                                                );
                                                call.resolve();
                                            } catch (Exception error) {
                                                call.reject(error.getMessage());
                                            }
                                        },
                                        600
                                    );
                                }
                            }
                        );
                        webView.loadUrl("file://" + file.getAbsolutePath());
                    } catch (Exception error) {
                        call.reject(error.getMessage());
                    }
                }
            );
    }
}