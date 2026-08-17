package com.ggautoworld.ghdmorder;

import android.app.*;
import android.os.Bundle;
import android.content.*;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.view.*;
import android.view.inputmethod.EditorInfo;
import android.widget.*;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

public class MainActivity extends Activity {
    private static final int REQ_IMPORT_MASTER = 1001;
    private static final int REQ_EXPORT_XLSX = 1002;
    private final LinkedHashMap<String, MasterItem> master = new LinkedHashMap<>();
    private final ArrayList<OrderItem> order = new ArrayList<>();
    private final ArrayList<String> partyHistory = new ArrayList<>();
    private TextView masterStatus, orderSummary, partyStatus;
    private AutoCompleteTextView partyInput;
    private Button lockPartyBtn;
    private EditText partInput, qtyInput, discountInput;
    private TableLayout orderTable;
    private byte[] pendingExport;
    private String currentParty = "";

    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        loadPartyHistory();
        setContentView(buildUi());
        loadSavedMaster();
        renderParty();
        renderOrder();
    }

    private View buildUi() {
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setPadding(dp(16),dp(14),dp(16),dp(12)); root.setBackgroundColor(Color.rgb(10,16,24));
        LinearLayout header=new LinearLayout(this); header.setOrientation(LinearLayout.HORIZONTAL); header.setGravity(Gravity.CENTER_VERTICAL);
        ImageView logo=new ImageView(this); logo.setImageResource(R.drawable.ghdm_icon); logo.setScaleType(ImageView.ScaleType.CENTER_CROP); header.addView(logo,new LinearLayout.LayoutParams(dp(62),dp(62)));
        LinearLayout ht=new LinearLayout(this); ht.setOrientation(LinearLayout.VERTICAL); ht.setPadding(dp(12),0,0,0); ht.addView(text("GHDM ORDER",24,Color.WHITE,true)); ht.addView(text("G & G Autoworld • Mobile Order Entry",12,Color.rgb(140,188,255),false)); header.addView(ht,new LinearLayout.LayoutParams(0,-2,1)); root.addView(header);

        LinearLayout masterCard=card(); masterCard.addView(text("PART MASTER (PRELOADED)",14,Color.WHITE,true)); masterStatus=text("Loading master...",13,Color.LTGRAY,false); masterStatus.setPadding(0,dp(5),0,dp(8)); masterCard.addView(masterStatus); Button importBtn=button("CHANGE MASTER FILE (.CSV / .XLSX)",Color.rgb(32,95,170)); importBtn.setOnClickListener(v->chooseMaster()); masterCard.addView(importBtn); root.addView(masterCard);

        LinearLayout partyCard=card(); partyCard.addView(text("ORDER PARTY",14,Color.WHITE,true)); partyStatus=text("Party not selected",12,Color.rgb(180,190,200),false); partyStatus.setPadding(0,dp(4),0,0); partyCard.addView(partyStatus);
        partyInput=new AutoCompleteTextView(this); styleEdit(partyInput,"Party Name — type/select"); partyInput.setSingleLine(true); partyInput.setThreshold(0); partyInput.setOnClickListener(v->partyInput.showDropDown()); partyInput.setImeOptions(EditorInfo.IME_ACTION_DONE); partyInput.setOnEditorActionListener((v,a,e)->{if(a==EditorInfo.IME_ACTION_DONE){lockParty();return true;}return false;}); partyCard.addView(partyInput);
        lockPartyBtn=button("SELECT & LOCK PARTY",Color.rgb(0,117,255)); LinearLayout.LayoutParams plp=new LinearLayout.LayoutParams(-1,dp(48)); plp.setMargins(0,dp(8),0,0); lockPartyBtn.setLayoutParams(plp); lockPartyBtn.setOnClickListener(v->lockParty()); partyCard.addView(lockPartyBtn); root.addView(partyCard);

        LinearLayout entryCard=card(); entryCard.addView(text("ORDER ENTRY — PART NO + QTY + DISCOUNT",14,Color.WHITE,true)); partInput=edit("Part No / Item No"); partInput.setSingleLine(true); partInput.setImeOptions(EditorInfo.IME_ACTION_NEXT); entryCard.addView(partInput); qtyInput=edit("Qty"); qtyInput.setInputType(android.text.InputType.TYPE_CLASS_NUMBER); qtyInput.setSingleLine(true); qtyInput.setImeOptions(EditorInfo.IME_ACTION_NEXT); entryCard.addView(qtyInput); discountInput=edit("Discount %"); discountInput.setInputType(android.text.InputType.TYPE_CLASS_NUMBER|android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL); discountInput.setSingleLine(true); discountInput.setImeOptions(EditorInfo.IME_ACTION_DONE); discountInput.setText("0"); entryCard.addView(discountInput); Button addBtn=button("ADD ITEM",Color.rgb(0,117,255)); LinearLayout.LayoutParams alp=new LinearLayout.LayoutParams(-1,dp(48)); alp.setMargins(0,dp(8),0,0); addBtn.setLayoutParams(alp); addBtn.setOnClickListener(v->addItem()); discountInput.setOnEditorActionListener((v,a,e)->{if(a==EditorInfo.IME_ACTION_DONE){addItem();return true;}return false;}); entryCard.addView(addBtn); root.addView(entryCard);

        orderSummary=text("0 Items",14,Color.WHITE,true); orderSummary.setPadding(0,dp(8),0,dp(6)); root.addView(orderSummary);
        HorizontalScrollView hsv=new HorizontalScrollView(this); ScrollView vsv=new ScrollView(this); orderTable=new TableLayout(this); orderTable.setStretchAllColumns(false); vsv.addView(orderTable); hsv.addView(vsv,new HorizontalScrollView.LayoutParams(-1,dp(250))); root.addView(hsv,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout actions=new LinearLayout(this); actions.setOrientation(LinearLayout.HORIZONTAL); actions.setPadding(0,dp(8),0,0); Button close=button("CLOSE ORDER",Color.rgb(105,45,45)); close.setOnClickListener(v->confirmCloseOrder()); Button export=button("DOWNLOAD ORDER EXCEL",Color.rgb(0,135,83)); export.setOnClickListener(v->exportOrder()); actions.addView(close,new LinearLayout.LayoutParams(0,dp(48),1)); LinearLayout.LayoutParams ep=new LinearLayout.LayoutParams(0,dp(48),2); ep.setMargins(dp(8),0,0,0); actions.addView(export,ep); root.addView(actions); return root;
    }

    private LinearLayout card(){LinearLayout x=new LinearLayout(this);x.setOrientation(LinearLayout.VERTICAL);x.setPadding(dp(12),dp(10),dp(12),dp(10));x.setBackgroundColor(Color.rgb(18,29,42));LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,dp(10),0,0);x.setLayoutParams(lp);return x;}
    private TextView text(String s,int sp,int color,boolean bold){TextView t=new TextView(this);t.setText(s);t.setTextSize(sp);t.setTextColor(color);if(bold)t.setTypeface(Typeface.DEFAULT,Typeface.BOLD);return t;}
    private void styleEdit(EditText e,String hint){e.setHint(hint);e.setHintTextColor(Color.rgb(130,145,160));e.setTextColor(Color.WHITE);e.setBackgroundColor(Color.rgb(9,19,30));e.setPadding(dp(12),0,dp(12),0);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(50));lp.setMargins(0,dp(8),0,0);e.setLayoutParams(lp);}
    private EditText edit(String hint){EditText e=new EditText(this);styleEdit(e,hint);return e;}
    private Button button(String s,int color){Button b=new Button(this);b.setText(s);b.setTextColor(Color.WHITE);b.setTextSize(12);b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);b.setBackgroundColor(color);return b;}
    private int dp(int v){return(int)(v*getResources().getDisplayMetrics().density+.5f);}

    private void loadPartyHistory(){String raw=getSharedPreferences("ghdm_order",MODE_PRIVATE).getString("party_history","");if(!raw.trim().isEmpty())for(String x:raw.split("\\n")){x=x.trim();if(!x.isEmpty()&&!partyHistory.contains(x))partyHistory.add(x);}}
    private void savePartyHistory(){StringBuilder s=new StringBuilder();for(String x:partyHistory){if(s.length()>0)s.append('\n');s.append(x);}getSharedPreferences("ghdm_order",MODE_PRIVATE).edit().putString("party_history",s.toString()).apply();}
    private void renderParty(){partyInput.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_dropdown_item_1line,partyHistory));boolean locked=!currentParty.isEmpty();if(locked)partyInput.setText(currentParty,false);partyInput.setEnabled(!locked);lockPartyBtn.setEnabled(!locked);partyStatus.setText(locked?"LOCKED: "+currentParty+" • Close Order tak same rahegi":"Party select karein, phir order items add karein");partyStatus.setTextColor(locked?Color.rgb(90,220,150):Color.rgb(180,190,200));}
    private void lockParty(){if(!currentParty.isEmpty()){toast("Party already locked: "+currentParty);return;}String p=partyInput.getText().toString().trim();if(p.isEmpty()){toast("Party Name dalo/select karo");return;}currentParty=p;boolean exists=false;for(String x:partyHistory)if(x.equalsIgnoreCase(p)){exists=true;break;}if(!exists){partyHistory.add(0,p);if(partyHistory.size()>100)partyHistory.remove(partyHistory.size()-1);savePartyHistory();}renderParty();partInput.requestFocus();toast("Party locked: "+p);}

    private void loadSavedMaster(){try{File f=new File(getFilesDir(),"master_upload.bin");if(!f.exists()){try(InputStream in=getAssets().open("input_data.csv")){LinkedHashMap<String,MasterItem> temp=readMasterCsv(in);master.clear();master.putAll(temp);masterStatus.setText("Preloaded master ready: "+master.size()+" parts");return;}}byte[] b=readAll(new FileInputStream(f));String type=getPreferences(MODE_PRIVATE).getString("master_type","csv");LinkedHashMap<String,MasterItem> temp="xlsx".equals(type)?XlsxMasterReader.read(new ByteArrayInputStream(b)):readMasterCsv(new ByteArrayInputStream(b));master.clear();master.putAll(temp);masterStatus.setText("Custom saved master: "+master.size()+" parts");}catch(Exception e){masterStatus.setText("Saved master load error • Re-import master");}}
    private void chooseMaster(){Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");i.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"text/csv","text/comma-separated-values","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/octet-stream"});startActivityForResult(i,REQ_IMPORT_MASTER);}

    @Override protected void onActivityResult(int req,int res,Intent data){super.onActivityResult(req,res,data);if(res!=RESULT_OK||data==null||data.getData()==null)return;Uri u=data.getData();if(req==REQ_IMPORT_MASTER){try(InputStream in=getContentResolver().openInputStream(u)){String name=fileName(u).toLowerCase(Locale.ROOT);byte[] bytes=readAll(in);boolean isXlsx=name.endsWith(".xlsx");LinkedHashMap<String,MasterItem> temp=isXlsx?XlsxMasterReader.read(new ByteArrayInputStream(bytes)):readMasterCsv(new ByteArrayInputStream(bytes));master.clear();master.putAll(temp);try(FileOutputStream fos=new FileOutputStream(new File(getFilesDir(),"master_upload.bin"))){fos.write(bytes);}getPreferences(MODE_PRIVATE).edit().putString("master_type",isXlsx?"xlsx":"csv").apply();masterStatus.setText("Master loaded & saved: "+master.size()+" parts • "+fileName(u));Toast.makeText(this,"Master updated and saved",Toast.LENGTH_SHORT).show();renderOrder();}catch(Exception e){showError("Master import failed",e);}}else if(req==REQ_EXPORT_XLSX&&pendingExport!=null){try(OutputStream out=getContentResolver().openOutputStream(u)){out.write(pendingExport);out.flush();Toast.makeText(this,"Order Excel saved",Toast.LENGTH_LONG).show();}catch(Exception e){showError("Export failed",e);}finally{pendingExport=null;}}}
    private String fileName(Uri uri){String n="file";try(android.database.Cursor c=getContentResolver().query(uri,null,null,null,null)){if(c!=null&&c.moveToFirst()){int ix=c.getColumnIndex(OpenableColumns.DISPLAY_NAME);if(ix>=0)n=c.getString(ix);}}catch(Exception ignored){}return n;}

    private void addItem(){if(currentParty.isEmpty()){toast("Pehle Party select & lock karo");partyInput.requestFocus();return;}String p=norm(partInput.getText().toString()),qs=qtyInput.getText().toString().trim(),ds=discountInput.getText().toString().trim();if(p.isEmpty()){toast("Part No dalo");return;}int q;try{q=Integer.parseInt(qs);}catch(Exception e){toast("Valid Qty dalo");return;}if(q<=0){toast("Qty 1 ya usse zyada honi chahiye");return;}double disc;try{disc=ds.isEmpty()?0:Double.parseDouble(ds);}catch(Exception e){toast("Valid Discount % dalo");return;}if(disc<0||disc>100){toast("Discount 0 se 100% ke beech hona chahiye");return;}MasterItem m=master.get(p);if(m==null){toast("Part No master me nahi mila: "+p);partInput.requestFocus();return;}OrderItem existing=null;for(OrderItem x:order)if(x.partNo.equals(p)&&Math.abs(x.discountPct-disc)<.0001){existing=x;break;}if(existing!=null)existing.qty+=q;else order.add(new OrderItem(p,m.description,m.mrp,q,disc));partInput.setText("");qtyInput.setText("");discountInput.setText("0");partInput.requestFocus();renderOrder();toast("Added: "+p+" × "+q+" • Disc "+fmt(disc)+"%");}
    private void renderOrder(){orderTable.removeAllViews();TableRow h=new TableRow(this);addCell(h,"#",true);addCell(h,"Part #",true);addCell(h,"Description",true);addCell(h,"Qty",true);addCell(h,"MRP",true);addCell(h,"Disc %",true);addCell(h,"Net Rate",true);addCell(h,"Value",true);addCell(h,"",true);orderTable.addView(h);int totalQty=0;double gross=0,net=0;for(int i=0;i<order.size();i++){final int idx=i;OrderItem x=order.get(i);MasterItem mm=master.get(x.partNo);if(mm!=null){x.description=mm.description;x.mrp=mm.mrp;}totalQty+=x.qty;gross+=x.qty*x.mrp;double nr=x.netRate(),val=nr*x.qty;net+=val;TableRow r=new TableRow(this);addCell(r,String.valueOf(i+1),false);addCell(r,x.partNo,false);addCell(r,x.description,false);addCell(r,String.valueOf(x.qty),false);addCell(r,fmt(x.mrp),false);addCell(r,fmt(x.discountPct)+"%",false);addCell(r,fmt(nr),false);addCell(r,fmt(val),false);Button del=button("X",Color.rgb(100,40,40));del.setOnClickListener(v->{order.remove(idx);renderOrder();});r.addView(del,new TableRow.LayoutParams(dp(52),dp(42)));orderTable.addView(r);}String party=currentParty.isEmpty()?"No Party":currentParty;orderSummary.setText(party+" • "+order.size()+" Lines • "+totalQty+" Qty • Gross ₹"+fmt(gross)+" • Net ₹"+fmt(net));}
    private void addCell(TableRow r,String s,boolean head){TextView t=text(s,head?12:11,head?Color.rgb(150,200,255):Color.WHITE,head);t.setPadding(dp(8),dp(8),dp(8),dp(8));t.setMaxWidth(dp(270));t.setMinWidth(dp(70));r.addView(t);}
    private void confirmCloseOrder(){if(order.isEmpty()&&currentParty.isEmpty())return;String msg="Party: "+(currentParty.isEmpty()?"—":currentParty)+"\nOrder close karne par saare entered items clear honge aur Party unlock ho jayegi.";new AlertDialog.Builder(this).setTitle("Close Order?").setMessage(msg).setNegativeButton("Cancel",null).setPositiveButton("Close Order",(d,w)->{order.clear();currentParty="";partyInput.setText("");renderParty();renderOrder();toast("Order closed • Party unlocked");}).show();}
    private void exportOrder(){if(currentParty.isEmpty()){toast("Party select nahi hai");return;}if(order.isEmpty()){toast("Pehle order items add karo");return;}try{pendingExport=SimpleXlsxWriter.build(order,currentParty);String ts=new SimpleDateFormat("yyyyMMdd_HHmm",Locale.US).format(new Date());String safe=currentParty.replaceAll("[^A-Za-z0-9_-]+","_");if(safe.length()>24)safe=safe.substring(0,24);Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");i.putExtra(Intent.EXTRA_TITLE,"GHDM_Order_"+safe+"_"+ts+".xlsx");startActivityForResult(i,REQ_EXPORT_XLSX);}catch(Exception e){showError("Excel create failed",e);}}

    private LinkedHashMap<String,MasterItem> readMasterCsv(InputStream in)throws Exception{byte[] b=readAll(in);String txt=decodeText(b);char delim=detectDelimiter(txt);List<String[]> rows=Csv.parse(txt,delim);LinkedHashMap<String,MasterItem> out=new LinkedHashMap<>();if(rows.isEmpty())return out;int header=-1,pi=-1,di=-1,mi=-1;for(int rr=0;rr<Math.min(20,rows.size());rr++){String[] a=rows.get(rr);for(int c=0;c<a.length;c++){String h=headerNorm(a[c]);if(pi<0&&(h.equals("part")||h.equals("partno")||h.equals("partnumber")||h.equals("itemno")||h.equals("itemnumber")))pi=c;if(di<0&&(h.equals("partdescription")||h.equals("description")||h.equals("itemdescription")))di=c;if(mi<0&&(h.equals("mrp")||h.equals("maxretailprice")||h.equals("maximumretailprice")))mi=c;}if(pi>=0){header=rr;break;}}if(header<0)throw new Exception("Part # column not found");for(int r=header+1;r<rows.size();r++){String[] a=rows.get(r);String p=pi<a.length?norm(a[pi]):"";if(p.isEmpty())continue;String d=di>=0&&di<a.length?a[di].trim():"";double mrp=mi>=0&&mi<a.length?num(a[mi]):0;out.put(p,new MasterItem(p,d,mrp));}return out;}
    private static byte[] readAll(InputStream in)throws IOException{ByteArrayOutputStream o=new ByteArrayOutputStream();byte[] buf=new byte[8192];int n;while((n=in.read(buf))>0)o.write(buf,0,n);return o.toByteArray();}
    private static String decodeText(byte[] b){if(b.length>2&&(b[0]&255)==255&&(b[1]&255)==254)return new String(b,2,b.length-2,StandardCharsets.UTF_16LE);if(b.length>2&&(b[0]&255)==254&&(b[1]&255)==255)return new String(b,2,b.length-2,StandardCharsets.UTF_16BE);return new String(b,StandardCharsets.UTF_8);}
    private static char detectDelimiter(String s){String first=s.split("\\r?\\n",2)[0];char[] ds={',','\t',';','|'};int best=-1;char out=',';for(char d:ds){int c=0;for(int i=0;i<first.length();i++)if(first.charAt(i)==d)c++;if(c>best){best=c;out=d;}}return out;}
    private static String headerNorm(String s){return s==null?"":s.toLowerCase(Locale.ROOT).replace("#"," ").replaceAll("[^a-z0-9]+","").trim();}
    private static String norm(String s){return s==null?"":s.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+","");}
    private static double num(String s){try{return Double.parseDouble(s.replace(",","").replace("₹","").trim());}catch(Exception e){return 0;}}
    private static String fmt(double v){return String.format(Locale.US,"%.2f",v);}
    private void toast(String s){Toast.makeText(this,s,Toast.LENGTH_SHORT).show();}
    private void showError(String t,Exception e){new AlertDialog.Builder(this).setTitle(t).setMessage(e.getMessage()==null?e.toString():e.getMessage()).setPositiveButton("OK",null).show();}
    static class MasterItem{String partNo,description;double mrp;MasterItem(String p,String d,double m){partNo=p;description=d;mrp=m;}}
    static class OrderItem{String partNo,description;double mrp,discountPct;int qty;OrderItem(String p,String d,double m,int q,double disc){partNo=p;description=d;mrp=m;qty=q;discountPct=disc;}double netRate(){return mrp*(1.0-discountPct/100.0);}}
    static class Csv{static List<String[]> parse(String s,char delim){ArrayList<String[]> rows=new ArrayList<>();ArrayList<String> row=new ArrayList<>();StringBuilder cell=new StringBuilder();boolean q=false;for(int i=0;i<s.length();i++){char ch=s.charAt(i);if(q){if(ch=='"'){if(i+1<s.length()&&s.charAt(i+1)=='"'){cell.append('"');i++;}else q=false;}else cell.append(ch);}else{if(ch=='"')q=true;else if(ch==delim){row.add(cell.toString());cell.setLength(0);}else if(ch=='\n'){row.add(cell.toString());cell.setLength(0);rows.add(row.toArray(new String[0]));row=new ArrayList<>();}else if(ch!='\r')cell.append(ch);}}if(cell.length()>0||!row.isEmpty()){row.add(cell.toString());rows.add(row.toArray(new String[0]));}return rows;}}
}
