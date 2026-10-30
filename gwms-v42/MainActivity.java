package com.ggautoworld.ghdmorder;

import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.webkit.*;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final String URL = "https://gwms-warehouse.vercel.app/?mobile=1";
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private static final int FILE_REQ = 901;

    @Override public void onCreate(Bundle b){
        super.onCreate(b);
        web=new WebView(this); setContentView(web);
        WebSettings s=web.getSettings();
        s.setJavaScriptEnabled(true); s.setDomStorageEnabled(true); s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true); s.setAllowContentAccess(true); s.setLoadWithOverviewMode(true); s.setUseWideViewPort(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r){
                Uri u=r.getUrl();
                if(u!=null && u.getHost()!=null && u.getHost().endsWith("vercel.app")) return false;
                try{startActivity(new Intent(Intent.ACTION_VIEW,u));return true;}catch(Exception e){return false;}
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView w, ValueCallback<Uri[]> cb, FileChooserParams p){
                if(fileCallback!=null) fileCallback.onReceiveValue(null); fileCallback=cb;
                try{startActivityForResult(p.createIntent(),FILE_REQ);}catch(Exception e){fileCallback=null;Toast.makeText(MainActivity.this,"File picker unavailable",Toast.LENGTH_SHORT).show();}
                return true;
            }
        });
        web.setDownloadListener((url,userAgent,contentDisposition,mimetype,contentLength)->{
            try{
                DownloadManager.Request req=new DownloadManager.Request(Uri.parse(url));
                req.setMimeType(mimetype); req.addRequestHeader("User-Agent",userAgent);
                String name=URLUtil.guessFileName(url,contentDisposition,mimetype);
                req.setTitle(name); req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS,name);
                ((DownloadManager)getSystemService(DOWNLOAD_SERVICE)).enqueue(req);
                Toast.makeText(this,"Downloading: "+name,Toast.LENGTH_SHORT).show();
            }catch(Exception e){ try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}catch(Exception ignored){} }
        });
        web.loadUrl(URL);
    }
    @Override protected void onActivityResult(int req,int result,Intent data){
        super.onActivityResult(req,result,data);
        if(req==FILE_REQ && fileCallback!=null){
            Uri[] out=null;
            if(result==RESULT_OK){
                if(data!=null && data.getClipData()!=null){int n=data.getClipData().getItemCount();out=new Uri[n];for(int i=0;i<n;i++)out[i]=data.getClipData().getItemAt(i).getUri();}
                else if(data!=null && data.getData()!=null) out=new Uri[]{data.getData()};
            }
            fileCallback.onReceiveValue(out); fileCallback=null;
        }
    }
    @Override public void onBackPressed(){ if(web!=null && web.canGoBack()) web.goBack(); else super.onBackPressed(); }
}