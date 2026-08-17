package com.ggautoworld.ghdmorder;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.zip.*;

class SimpleXlsxWriter {
    static byte[] build(List<MainActivity.OrderItem> rows, String partyName) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ZipOutputStream z = new ZipOutputStream(out);
        put(z,"[Content_Types].xml","<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/><Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/></Types>");
        put(z,"_rels/.rels","<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");
        put(z,"xl/workbook.xml","<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"Order\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
        put(z,"xl/_rels/workbook.xml.rels","<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/><Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>");
        put(z,"xl/styles.xml","<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><numFmts count=\"2\"><numFmt numFmtId=\"164\" formatCode=\"0.00\"/><numFmt numFmtId=\"165\" formatCode=\"0.00%\"/></numFmts><fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font><font><b/><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts><fills count=\"1\"><fill><patternFill patternType=\"none\"/></fill></fills><borders count=\"1\"><border/></borders><cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs><cellXfs count=\"4\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/><xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/><xf numFmtId=\"164\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/><xf numFmtId=\"165\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/></cellXfs></styleSheet>");

        StringBuilder s=new StringBuilder();
        s.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><cols>")
         .append("<col min=\"1\" max=\"1\" width=\"22\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"48\" customWidth=\"1\"/><col min=\"3\" max=\"3\" width=\"10\" customWidth=\"1\"/><col min=\"4\" max=\"7\" width=\"15\" customWidth=\"1\"/>")
         .append("</cols><sheetData>");
        s.append("<row r=\"1\">").append(str("A1","Party Name",1)).append(str("B1",partyName,0)).append(str("D1","Order Date",1)).append(str("E1",new SimpleDateFormat("dd-MM-yyyy HH:mm",Locale.US).format(new Date()),0)).append("</row>");
        s.append("<row r=\"3\">").append(str("A3","Part #",1)).append(str("B3","Part Description",1)).append(str("C3","Qty",1)).append(str("D3","MRP",1)).append(str("E3","Discount %",1)).append(str("F3","Net Rate",1)).append(str("G3","Line Value",1)).append("</row>");
        int r=4;
        for(MainActivity.OrderItem x:rows){
            s.append("<row r=\"").append(r).append("\">");
            s.append(str("A"+r,x.partNo,0)); s.append(str("B"+r,x.description,0)); s.append(numInt("C"+r,x.qty)); s.append(num("D"+r,x.mrp,2));
            s.append(num("E"+r,x.discountPct/100.0,3)); s.append(num("F"+r,x.netRate(),2)); s.append(num("G"+r,x.netRate()*x.qty,2));
            s.append("</row>"); r++;
        }
        s.append("</sheetData><autoFilter ref=\"A3:G").append(Math.max(3,r-1)).append("\"/><sheetViews><sheetView workbookViewId=\"0\"><pane ySplit=\"3\" topLeftCell=\"A4\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews></worksheet>");
        put(z,"xl/worksheets/sheet1.xml",s.toString()); z.close(); return out.toByteArray();
    }
    private static String str(String ref,String v,int style){ return "<c r=\""+ref+"\" t=\"inlineStr\" s=\""+style+"\"><is><t>"+esc(v)+"</t></is></c>"; }
    private static String num(String ref,double v,int style){ return "<c r=\""+ref+"\" s=\""+style+"\"><v>"+String.format(Locale.US,"%.6f",v)+"</v></c>"; }
    private static String numInt(String ref,int v){ return "<c r=\""+ref+"\"><v>"+v+"</v></c>"; }
    private static String esc(String s){ if(s==null)return ""; return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;"); }
    private static void put(ZipOutputStream z,String name,String content)throws IOException{ z.putNextEntry(new ZipEntry(name)); z.write(content.getBytes(StandardCharsets.UTF_8)); z.closeEntry(); }
}
