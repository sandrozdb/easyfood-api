const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs");
test("listagem trata payloads HTML como texto e categorias sem handlers interpolados",async()=>{
 const nodes=new Map();function element(){return {innerHTML:"",textContent:"",value:"",children:[],addEventListener(){},append(child){this.children.push(child);},replaceChildren(){this.children=[];}};}
 const doc={getElementById:id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},createElement:element};
 const attack='<img src=x onerror="alert(1)">';
 const rows=[{name:attack,category:attack,description:attack,address:attack,phone:attack,rating:4}];
 const html=fs.readFileSync(require.resolve("../public/index.html"),"utf8");const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).find(s=>s.includes("function mostrarRestaurantes"));
 const ctx=vm.createContext({document:doc,fetch:async()=>({ok:true,json:async()=>rows}),console});vm.runInContext(script,ctx);await new Promise(setImmediate);
 const rendered=nodes.get("lista-restaurantes").innerHTML;assert.ok(!rendered.includes("<img"));assert.ok(rendered.includes("&lt;img"));
 assert.equal(nodes.get("categorias").children[1].textContent,attack);assert.equal(nodes.get("categorias").innerHTML,"");
});
