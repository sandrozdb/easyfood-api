const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),service=require("../src/modules/reviews/reviewService");
function audit(){const entries=[];return{entries,recordBestEffort:async e=>entries.push(e)};}
function repo(overrides={}){let rows=[{id:1,userId:7,restaurantId:2,rating:5,comment:null,createdAt:new Date(),author:{id:7,name:"Cliente"}}];return{restaurantExists:async()=>true,listByRestaurant:async()=>rows,summary:async()=>({averageRating:rows.length?rows.reduce((s,r)=>s+r.rating,0)/rows.length:0,reviewCount:rows.length}),findById:async id=>rows.find(r=>r.id===id)||null,create:async data=>{const row={id:2,...data};rows.push(row);return row;},update:async(id,userId,data)=>{const row=rows.find(r=>r.id===id&&r.userId===userId);if(!row)return null;Object.assign(row,data);return row;},remove:async(id,userId)=>{const before=rows.length;rows=rows.filter(r=>!(r.id===id&&r.userId===userId));return{count:before-rows.length};},...overrides};}
const client={id:7,role:"cliente"},other={id:8,role:"cliente"};
function response(){return{code:0,status(value){this.code=value;return this;},json(){}};}
test("cliente cria avaliação",async()=>assert.equal((await service.create(2,{rating:4,comment:"Bom"},client,repo(),audit())).rating,4));
test("rating 1 funciona",()=>assert.equal(service.input({rating:1}).rating,1));
test("rating 5 funciona",()=>assert.equal(service.input({rating:5}).rating,5));
for(const value of [0,6,4.5])test(`rating ${value} é rejeitado`,()=>assert.throws(()=>service.input({rating:value}),/inteiro entre 1 e 5/));
test("comentário é opcional e vira null",()=>assert.equal(service.input({rating:4}).comment,null));
test("comentário vazio vira null",()=>assert.equal(service.input({rating:4,comment:"  "}).comment,null));
test("comentário grande demais é rejeitado",()=>assert.throws(()=>service.input({rating:4,comment:"x".repeat(501)}),/500/));
test("mass assignment de user_id é rejeitado",()=>assert.throws(()=>service.input({rating:4,user_id:99}),/Campos inválidos/));
test("mass assignment de restaurant_id é rejeitado",()=>assert.throws(()=>service.input({rating:4,restaurant_id:99}),/Campos inválidos/));
test("duplicidade vira conflito 409",async()=>{const error=Object.assign(new Error(),{code:"P2002"});await assert.rejects(()=>service.create(2,{rating:4},client,repo({create:async()=>{throw error;}}),audit()),e=>e.status===409);});
test("cliente edita própria review",async()=>assert.equal((await service.update(1,{rating:3},client,repo(),audit())).rating,3));
test("outro cliente não edita review",async()=>assert.rejects(()=>service.update(1,{rating:3},other,repo(),audit()),e=>e.status===403));
test("cliente exclui própria review",async()=>await assert.doesNotReject(()=>service.remove(1,client,repo(),audit())));
test("outro cliente não exclui review",async()=>assert.rejects(()=>service.remove(1,other,repo(),audit()),e=>e.status===403));
test("GET público retorna reviews",async()=>assert.equal((await service.list(2,repo())).items.length,1));
test("média é calculada corretamente",async()=>{const r=repo({listByRestaurant:async()=>[],summary:async()=>({averageRating:4.5,reviewCount:2})});assert.equal((await service.list(2,r)).averageRating,4.5);});
test("reviewCount é correto",async()=>assert.equal((await service.list(2,repo())).reviewCount,1));
test("exclusão recalcula média",async()=>{const r=repo();await service.remove(1,client,r,audit());assert.deepEqual(await r.summary(),{averageRating:0,reviewCount:0});});
test("edição recalcula média",async()=>{const r=repo();await service.update(1,{rating:2},client,r,audit());assert.equal((await r.summary()).averageRating,2);});
for(const [name,operation,action] of [["criação","create","review.create"],["edição","update","review.update"],["exclusão","remove","review.delete"]])test(`Activity Log na ${name}`,async()=>{const a=audit(),r=repo();if(operation==="create")await service.create(2,{rating:4},client,r,a);else if(operation==="update")await service.update(1,{rating:4},client,r,a);else await service.remove(1,client,r,a);assert.equal(a.entries[0].action,action);assert.equal(a.entries[0].metadata.comment,undefined);});
test("rotas restringem escrita a cliente autenticado",()=>{const source=fs.readFileSync(require.resolve("../src/modules/reviews/reviewRoutes.js"),"utf8");assert.match(source,/authMiddleware,allowRoles\("cliente"\)/);});
test("restaurante e admin não criam review pela regra de rota",()=>{const source=fs.readFileSync(require.resolve("../src/modules/reviews/reviewRoutes.js"),"utf8");assert.doesNotMatch(source,/allowRoles\("cliente"\s*,/);});
for(const role of ["restaurante","admin"])test(`${role} recebe 403 ao criar review`,()=>{const res=response();require("../src/middlewares/roleMiddleware").allowRoles("cliente")({user:{role}},res,()=>assert.fail("Não deve permitir"));assert.equal(res.code,403);});
test("sem autenticação recebe 401 ao criar review",async()=>{const res=response();await require("../src/middlewares/authMiddleware").createAuthMiddleware()({get:()=>""},res,()=>assert.fail("Não deve permitir"));assert.equal(res.code,401);});
test("GET de reviews permanece público",()=>{const source=fs.readFileSync(require.resolve("../src/modules/reviews/reviewRoutes.js"),"utf8");assert.match(source,/get\("\/:restaurantId\/reviews",controller\.list\)/);});
test("frontend renderiza comentário com textContent",()=>{const source=fs.readFileSync(require.resolve("../public/restaurant.js"),"utf8");assert.match(source,/node\.textContent=text/);assert.doesNotMatch(source,/innerHTML/);});
test("frontend mostra média e formulário de avaliação",()=>{const html=fs.readFileSync(require.resolve("../public/restaurant.html"),"utf8");assert.match(html,/rating-summary/);assert.match(html,/review-form/);});
