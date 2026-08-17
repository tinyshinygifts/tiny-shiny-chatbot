package com.ggautoworld.ghdmorder;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.*;

class SimpleXlsxWriter {
    static byte[] build(List<MainActivity.OrderItem> rows) throws Exception {
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        ZipOutputStream z=new ZipOutputStream(out);

        put(z,"[Content_Types].xml","<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/><Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/><Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/><Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/></Types>");
        put(z,"_rels/.rels","<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");
        put(z,"xl/workbook.xml","<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><bookViews><workbookView xWindow=\"0\" yWindow=\"0\" windowWidth=\"20000\" windowHeight=\"12000\"/></bookViews><sheets><sheet name=\"Order\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
        put(z,"xl/_rels/workbook.xml.rels","<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/><Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>");

        String styles="<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
                +"<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">"
                +"<numFmts count=\"1\"><numFmt numFmtId=\"164\" formatCode=\"#,##0.00\"/></numFmts>"
                +"<fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/><family val=\"2\"/></font><font><b/><sz val=\"11\"/><color rgb=\"FFFFFFFF\"/><name val=\"Calibri\"/><family val=\"2\"/></font></fonts>"
                +"<fills count=\"3\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FF1F4E78\"/><bgColor indexed=\"64\"/></patternFill></fill></fills>"
                +"<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>"
                +"<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>"
                +"<cellXfs count=\"3\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/><xf numFmtId=\"0\" fontId=\"1\" fillId=\"2\" borderId=\"0\" xfId=\"0\" applyFont=\"1\" applyFill=\"1\" applyAlignment=\"1\"><alignment horizontal=\"center\" vertical=\"center\"/></xf><xf numFmtId=\"164\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\" applyNumberFormat=\"1\"/></cellXfs>"
                +"<cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles>"
                +"</styleSheet>";
        put(z,"xl/styles.xml",styles);

        int lastRow=Math.max(1,rows.size()+1);
        StringBuilder s=new StringBuilder();
        s.append("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>")
         .append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">")
         .append("<dimension ref=\"A1:H").append(lastRow).append("\"/>")
         .append("<sheetViews><sheetView workbookViewId=\"0\"><pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/><selection pane=\"bottomLeft\" activeCell=\"A2\" sqref=\"A2\"/></sheetView></sheetViews>")
         .append("<sheetFormatPr defaultRowHeight=\"15\"/>")
         .append("<cols><col min=\"1\" max=\"1\" width=\"8\" customWidth=\"1\"/><col min=\"2\" max=\"2\" width=\"38\" customWidth=\"1\"/><col min=\"3\" max=\"3\" width=\"22\" customWidth=\"1\"/><col min=\"4\" max=\"4\" width=\"48\" customWidth=\"1\"/><col min=\"5\" max=\"8\" width=\"15\" customWidth=\"1\"/></cols>")
         .append("<sheetData>");

        String[] h={"Line","PARTY NAME","Part #","Part Description","ORDER QTY","DISCOUNT","MRP","AMOUNT"};
        s.append("<row r=\"1\">");
        for(int i=0;i<h.length;i++)s.append(str(col(i)+"1",h[i],1));
        s.append("</row>");

        int r=2,line=1;
        for(MainActivity.OrderItem x:rows){
            s.append("<row r=\"").append(r).append("\">");
            s.append(numInt("A"+r,line++))
             .append(str("B"+r,x.partyName,0))
             .append(str("C"+r,x.partNo,0))
             .append(str("D"+r,x.description,0))
             .append(numInt("E"+r,x.qty))
             .append(num("F"+r,x.discountPct,2))
             .append(num("G"+r,x.mrp,2))
             .append(num("H"+r,x.amount(),2));
            s.append("</row>");
            r++;
        }
        s.append("</sheetData><autoFilter ref=\"A1:H").append(lastRow).append("\"/>")
         .append("<pageMargins left=\"0.7\" right=\"0.7\" top=\"0.75\" bottom=\"0.75\" header=\"0.3\" footer=\"0.3\"/>")
         .append("</worksheet>");
        put(z,"xl/worksheets/sheet1.xml",s.toString());

        z.close();
        return out.toByteArray();
    }

    private static String col(int i){return String.valueOf((char)('A'+i));}
    private static String str(String ref,String v,int style){return "<c r=\""+ref+"\" t=\"inlineStr\" s=\""+style+"\"><is><t>"+esc(v)+"</t></is></c>";}
    private static String num(String ref,double v,int style){return "<c r=\""+ref+"\" s=\""+style+"\"><v>"+String.format(Locale.US,"%.6f",v)+"</v></c>";}
    private static String numInt(String ref,int v){return "<c r=\""+ref+"\"><v>"+v+"</v></c>";}
    private static String esc(String s){if(s==null)return"";return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;");}
    private static void put(ZipOutputStream z,String name,String content)throws IOException{z.putNextEntry(new ZipEntry(name));z.write(content.getBytes(StandardCharsets.UTF_8));z.closeEntry();}
}
