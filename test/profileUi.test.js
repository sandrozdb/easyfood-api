const test=require("node:test"),assert=require("node:assert/strict"),vm=require("node:vm"),fs=require("node:fs");
function setup(role,path){
 const nodes=new Map(),calls=[];function el(){return {hidden:true,children:[],textContent:"",append(...children){this.children.push(...children);},replaceChildren(){this.children=[];},setAttribute(){}};}
 const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,el());return nodes.get(id);},createElement:el};
 const context={document,location:{pathname:path,replace:url=>calls.push(url)},EasyAuth:{me:async()=>({id:1,role,name:"Teste"}),logout:async()=>calls.push("logout"),api:async url=>{calls.push(url);return {ok:true,status:200,json:async()=>url.startsWith("/admin/activity")?{items:[],page:1,pages:0}:url.startsWith("/admin")?[]:[{id:10,name:"Teste",address:"Rua Teste",owner_id:1}]};}}};
 return {nodes,calls,context};
}
for(const role of ["cliente","restaurante","admin"]){
 test("links de perfil: "+role,async()=>{const s=setup(role,"/perfil.html");await vm.runInNewContext(fs.readFileSync(require.resolve("../public/profile.js"),"utf8"),s.context);
 assert.equal(s.nodes.get("dashboard").hidden,role==="cliente");assert.equal(s.nodes.get("admin").hidden,role!=="admin");await s.nodes.get("logout").onclick();assert.ok(s.calls.includes("logout"));});
 test("painel admin: "+role,async()=>{const s=setup(role,"/admin.html");await vm.runInNewContext(fs.readFileSync(require.resolve("../public/dashboard.js"),"utf8"),s.context);
 if(role==="admin"){assert.equal(s.nodes.get("admin-content").hidden,false);assert.ok(s.calls.includes("/admin/users?offset=0"));}else{assert.match(s.nodes.get("status").textContent,/não tem acesso/);assert.equal(s.calls.length,0);}});
}
test("dashboard do dono oculta segundo cadastro e oferece edição",async()=>{const s=setup("restaurante","/dashboard.html");await vm.runInNewContext(fs.readFileSync(require.resolve("../public/dashboard.js"),"utf8"),s.context);assert.equal(s.nodes.get("create").hidden,true);const card=s.nodes.get("restaurants").children[0];assert.ok(card.children.some(el=>el.href==="/cadastro.html?id=10"));assert.ok(!s.calls.some(url=>url.startsWith("/admin")));});
