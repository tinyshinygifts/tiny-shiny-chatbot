package main

import (
    "bytes"
    "encoding/json"
    "encoding/xml"
    "fmt"
    "io"
    "log"
    "net/http"
    "os/exec"
    "runtime"
    "sort"
    "strconv"
    "strings"
    "time"
)

const version = "1.0.0"
const listenAddr = "127.0.0.1:17321"

var allowedOrigins = map[string]bool{
    "https://gwms-warehouse.vercel.app": true,
    "https://gwms-warehouse-tinyecom-5108.vercel.app": true,
}

func cors(w http.ResponseWriter, r *http.Request) bool {
    origin := r.Header.Get("Origin")
    if origin != "" {
        if !allowedOrigins[origin] {
            http.Error(w, "Origin not allowed", http.StatusForbidden)
            return false
        }
        w.Header().Set("Access-Control-Allow-Origin", origin)
        w.Header().Set("Vary", "Origin")
    }
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusNoContent)
        return false
    }
    return true
}

func tallyURL(r *http.Request) string {
    port := r.URL.Query().Get("port")
    if port == "" { port = "9000" }
    if _, err := strconv.Atoi(port); err != nil { port = "9000" }
    return "http://127.0.0.1:" + port
}

func postTally(url string, body []byte) ([]byte, int, error) {
    c := &http.Client{Timeout: 8 * time.Second}
    req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
    if err != nil { return nil, 0, err }
    req.Header.Set("Content-Type", "text/xml; charset=utf-8")
    resp, err := c.Do(req)
    if err != nil { return nil, 0, err }
    defer resp.Body.Close()
    b, err := io.ReadAll(io.LimitReader(resp.Body, 15<<20))
    return b, resp.StatusCode, err
}

func jsonOut(w http.ResponseWriter, v any) {
    w.Header().Set("Content-Type", "application/json; charset=utf-8")
    json.NewEncoder(w).Encode(v)
}

func health(w http.ResponseWriter, r *http.Request) {
    if !cors(w,r) { return }
    payload := []byte(`<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Company</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`)
    _, status, err := postTally(tallyURL(r), payload)
    jsonOut(w, map[string]any{"ok": true, "version": version, "tallyReachable": err == nil && status >= 200 && status < 500, "tallyUrl": tallyURL(r)})
}

func proxy(w http.ResponseWriter, r *http.Request) {
    if !cors(w,r) { return }
    if r.Method != http.MethodPost { http.Error(w,"POST only",405); return }
    b, err := io.ReadAll(io.LimitReader(r.Body, 15<<20))
    if err != nil { http.Error(w,err.Error(),400); return }
    out, status, err := postTally(tallyURL(r), b)
    if err != nil { http.Error(w,"Tally connection failed: "+err.Error(),502); return }
    w.Header().Set("Content-Type","text/xml; charset=utf-8")
    w.WriteHeader(status)
    w.Write(out)
}

func partyXML() []byte {
return []byte(`<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>GWMS Party Master</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
<TDL><TDLMESSAGE>
<REPORT NAME="GWMS Party Master"><FORMS>GWMS Party Form</FORMS></REPORT>
<FORM NAME="GWMS Party Form"><PARTS>GWMS Party Part</PARTS></FORM>
<PART NAME="GWMS Party Part"><LINES>GWMS Party Line</LINES><REPEAT>GWMS Party Line : GWMS Party Coll</REPEAT></PART>
<LINE NAME="GWMS Party Line"><FIELDS>GWMS Party Name</FIELDS></LINE>
<FIELD NAME="GWMS Party Name"><SET>$Name</SET><XMLTAG>NAME</XMLTAG></FIELD>
<COLLECTION NAME="GWMS Party Coll"><TYPE>Ledger</TYPE><FETCH>Name</FETCH></COLLECTION>
</TDLMESSAGE></TDL></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`)
}

func partXML() []byte {
return []byte(`<ENVELOPE>
<HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
<BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>GWMS Part Master</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES>
<TDL><TDLMESSAGE>
<REPORT NAME="GWMS Part Master"><FORMS>GWMS Part Form</FORMS></REPORT>
<FORM NAME="GWMS Part Form"><PARTS>GWMS Part Part</PARTS></FORM>
<PART NAME="GWMS Part Part"><LINES>GWMS Part Line</LINES><REPEAT>GWMS Part Line : GWMS Part Coll</REPEAT></PART>
<LINE NAME="GWMS Part Line"><FIELDS>GWMS Part No, GWMS Part Desc, GWMS Part MRP</FIELDS></LINE>
<FIELD NAME="GWMS Part No"><SET>$Name</SET><XMLTAG>PARTNO</XMLTAG></FIELD>
<FIELD NAME="GWMS Part Desc"><SET>if $$IsEmpty:$Description then $Name else $Description</SET><XMLTAG>DESCRIPTION</XMLTAG></FIELD>
<FIELD NAME="GWMS Part MRP"><SET>$StandardPrice</SET><XMLTAG>MRP</XMLTAG></FIELD>
<COLLECTION NAME="GWMS Part Coll"><TYPE>Stock Item</TYPE><FETCH>Name,Description,StandardPrice</FETCH></COLLECTION>
</TDLMESSAGE></TDL></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`)
}

func extractAll(data []byte, tag string) []string {
    dec := xml.NewDecoder(bytes.NewReader(data))
    var out []string
    tag = strings.ToUpper(tag)
    for {
        tok, err := dec.Token(); if err != nil { break }
        if se, ok := tok.(xml.StartElement); ok && strings.ToUpper(se.Name.Local)==tag {
            var v string
            if err:=dec.DecodeElement(&v,&se); err==nil { v=strings.TrimSpace(v); if v!="" { out=append(out,v) } }
        }
    }
    return out
}

func parseParts(data []byte) []map[string]any {
    var parts []map[string]any
    pnos:=extractAll(data,"PARTNO"); descs:=extractAll(data,"DESCRIPTION"); mrps:=extractAll(data,"MRP")
    for i,p:=range pnos {
        d:=p; if i<len(descs) && strings.TrimSpace(descs[i])!="" { d=strings.TrimSpace(descs[i]) }
        m:=0.0; if i<len(mrps) { s:=strings.NewReplacer(",","","₹","","Rs.","","Rs"," ").Replace(mrps[i]); fmt.Sscanf(strings.TrimSpace(s),"%f",&m) }
        parts=append(parts,map[string]any{"partNo":strings.TrimSpace(p),"description":d,"mrp":m})
    }
    return parts
}

func parties(w http.ResponseWriter,r *http.Request){
    if !cors(w,r){return}; b,_,err:=postTally(tallyURL(r),partyXML()); if err!=nil{http.Error(w,"Tally connection failed: "+err.Error(),502);return}
    vals:=extractAll(b,"NAME"); set:=map[string]bool{}; for _,v:=range vals{if v!=""{set[v]=true}}
    out:=make([]string,0,len(set)); for v:=range set{out=append(out,v)}; sort.Strings(out); jsonOut(w,map[string]any{"parties":out})
}
func parts(w http.ResponseWriter,r *http.Request){
    if !cors(w,r){return}; b,_,err:=postTally(tallyURL(r),partXML()); if err!=nil{http.Error(w,"Tally connection failed: "+err.Error(),502);return}; jsonOut(w,map[string]any{"parts":parseParts(b)})
}
func all(w http.ResponseWriter,r *http.Request){
    if !cors(w,r){return}
    pb,_,e1:=postTally(tallyURL(r),partyXML()); ib,_,e2:=postTally(tallyURL(r),partXML()); if e1!=nil||e2!=nil{http.Error(w,"Tally sync failed",502);return}
    vals:=extractAll(pb,"NAME"); set:=map[string]bool{}; for _,v:=range vals{set[v]=true}; ps:=make([]string,0,len(set)); for v:=range set{ps=append(ps,v)}; sort.Strings(ps)
    jsonOut(w,map[string]any{"parties":ps,"parts":parseParts(ib)})
}

func openBrowser(url string) {
    var cmd *exec.Cmd
    switch runtime.GOOS { case "windows": cmd=exec.Command("rundll32","url.dll,FileProtocolHandler",url); case "darwin": cmd=exec.Command("open",url); default: cmd=exec.Command("xdg-open",url) }
    _=cmd.Start()
}

func main(){
    mux:=http.NewServeMux(); mux.HandleFunc("/health",health); mux.HandleFunc("/proxy",proxy); mux.HandleFunc("/masters/party",parties); mux.HandleFunc("/masters/part",parts); mux.HandleFunc("/masters/all",all)
    srv:=&http.Server{Addr:listenAddr,Handler:mux,ReadHeaderTimeout:5*time.Second}
    fmt.Println("GWMS Tally Connector v"+version)
    fmt.Println("Listening on http://"+listenAddr)
    fmt.Println("Keep this window open while GWMS uses Tally.")
    go func(){time.Sleep(700*time.Millisecond); openBrowser("https://gwms-warehouse.vercel.app/#settings")}()
    log.Fatal(srv.ListenAndServe())
}