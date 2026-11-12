const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const { webcrypto, createHash } = require("node:crypto");
const source = fs.readFileSync(require.resolve("../public/auth.js"), "utf8");
function setup(pending, search = "") {
    const data = new Map(); if (pending !== undefined) data.set("easyfood.oauth", typeof pending === "string" ? pending : JSON.stringify(pending));
    const calls = [], redirects = [];
    const config = {domain:"https://example.auth.us-east-1.amazoncognito.com",clientId:"public-client",redirectUri:"http://localhost:3000/callback.html",logoutUri:"http://localhost:3000/index.html",scope:"openid email profile"};
    const context = {window:{},crypto:webcrypto,TextEncoder,Uint8Array,URL,URLSearchParams,btoa,
        sessionStorage:{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)},
        location:{search,pathname:"/callback.html",assign:url=>redirects.push(String(url)),replace:url=>redirects.push(String(url))},
        history:{replaceState(){}},fetch:async(url,options)=>{calls.push({url,options});return {ok:true,status:200,json:async()=>url==="/auth/config"?config:url==="/auth/me"?{role:"cliente"}:{access_token:"fake-access"}};}};
    vm.runInNewContext(source,context);return {auth:context.window.EasyAuth,context,data,calls,redirects,config};
}
const valid=()=>({state:"s".repeat(43),verifier:"v".repeat(43),created:Date.now()});
const query="?code=test-code&state="+"s".repeat(43);
test("PKCE S256 corresponde ao verifier e não contém secret",async()=>{
 const s=setup();await s.auth.login();const url=new URL(s.redirects[0]);const saved=JSON.parse(s.data.get("easyfood.oauth"));
 assert.equal(url.searchParams.get("code_challenge"),createHash("sha256").update(saved.verifier).digest("base64url"));
 assert.equal(url.searchParams.get("state"),saved.state);assert.equal(url.searchParams.get("code_challenge_method"),"S256");assert.equal(url.searchParams.has("client_secret"),false);
});
for(const [name,pending,search] of [
 ["sem estado",undefined,query],["JSON inválido","{",query],["estado divergente",valid(),"?code=c&state=errado"],
 ["expirado",{...valid(),created:Date.now()-700000},query],["data ausente",{state:"s".repeat(43),verifier:"v".repeat(43)},query],
 ["data futura",{...valid(),created:Date.now()+100000},query],["verifier inválido",{...valid(),verifier:"x"},query],
 ["code duplicado",valid(),query+"&code=outro"],["state duplicado",valid(),query+"&state=outro"],["erro OAuth",valid(),query+"&error=access_denied"]
]) test("callback recusa "+name+" antes de acessar provedor",async()=>{
 const s=setup(pending,search);await assert.rejects(s.auth.callback(),/sessão de login inválida/);assert.equal(s.calls.length,0);assert.equal(s.data.has("easyfood.oauth"),false);
});
test("callback válido consome estado uma vez e valida perfil pela API",async()=>{
 const s=setup(valid(),query);await s.auth.callback();assert.equal(s.data.get("easyfood.access"),"fake-access");assert.equal(s.redirects[0],"/perfil.html");
 assert.equal(s.calls[1].options.body.get("code_verifier"),"v".repeat(43));assert.equal(s.calls[2].options.headers.Authorization,"Bearer fake-access");await assert.rejects(s.auth.callback());
});
test("logout limpa token e estado antes de redirecionar ao Cognito",async()=>{
 const s=setup(valid());s.data.set("easyfood.access","fake-access");await s.auth.logout();assert.equal(s.data.size,0);const url=new URL(s.redirects[0]);assert.equal(url.pathname,"/logout");assert.equal(url.searchParams.get("logout_uri"),s.config.logoutUri);
});
test("falha externa no logout ainda limpa token local",async()=>{
 const s=setup(valid());s.data.set("easyfood.access","fake-access");s.context.fetch=async()=>{throw new Error("Offline");};await assert.rejects(s.auth.logout());assert.equal(s.data.size,0);
});
test("401 elimina token armazenado",async()=>{
 const s=setup();s.data.set("easyfood.access","fake-access");s.context.fetch=async()=>({status:401});await s.auth.api("/auth/me");assert.equal(s.data.has("easyfood.access"),false);
});
