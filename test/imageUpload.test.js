const test = require("node:test");
const assert = require("node:assert/strict");
const service = require("../src/modules/dishes/dishService");
const realStorage = require("../src/services/storage/s3StorageService");

const jpeg = Buffer.from([0xff,0xd8,0xff,0x00]);
const png = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
const webp = Buffer.from("RIFF0000WEBP", "ascii");
const baseRecord = { id:7,name:"Prato",category:"Teste",description:"",price:10,imageUrl:null,imageKey:null,available:true,restaurantId:10,createdAt:new Date(0),updatedAt:new Date(0),restaurant:{id:10,name:"Restaurante",owner_id:2} };

function setup({ imageKey = null, failDatabase = false, failUpload = false, notConfigured = false } = {}) {
    let record = { ...baseRecord, imageKey };
    const calls = [];
    const repo = {
        findRecordById: async id => id === 7 ? { ...record, restaurant:{...record.restaurant} } : null,
        updateImageReference: async (id, ownerId, data) => { calls.push(["database",data]); if (failDatabase) throw new Error("db"); record={...record,...data}; return {...record}; },
        remove: async () => { calls.push(["dish-delete"]); return {count:1}; }
    };
    const storage = {
        StorageNotConfiguredError: realStorage.StorageNotConfiguredError,
        buildDishKey: ({restaurantId,dishId,extension}) => `easyfood/dishes/restaurant-${restaurantId}/dish-${dishId}/00000000-0000-4000-8000-000000000000.${extension}`,
        upload: async input => { calls.push(["upload",input.key,input.contentType]); if(notConfigured) throw new realStorage.StorageNotConfiguredError(); if(failUpload) throw new Error("s3"); },
        remove: async key => { calls.push(["remove",key]); },
        getReadUrl: async key => `https://signed.example/${key}`
    };
    return {repo,storage,calls,getRecord:()=>record};
}
const owner={id:2,role:"restaurante"},other={id:3,role:"restaurante"},admin={id:1,role:"admin"},client={id:4,role:"cliente"};

test("aceita assinaturas JPEG, PNG e WEBP",()=>{
    assert.equal(service.validateImageFile(jpeg,"image/jpeg"),"jpg");
    assert.equal(service.validateImageFile(png,"image/png"),"png");
    assert.equal(service.validateImageFile(webp,"image/webp"),"webp");
});
test("bloqueia SVG, HTML e MIME inválido",()=>{
    for(const type of ["image/svg+xml","text/html","application/octet-stream"]) assert.throws(()=>service.validateImageFile(Buffer.from("<svg>"),type),error=>error.status===415);
});
test("bloqueia arquivo acima de 5 MB",()=>assert.throws(()=>service.validateImageFile(Buffer.alloc(service.MAX_IMAGE_BYTES+1),"image/jpeg"),error=>error.status===413));
test("bloqueia MIME que não corresponde aos bytes",()=>assert.throws(()=>service.validateImageFile(png,"image/jpeg"),error=>error.status===400));
test("upload válido salva somente imageKey e retorna URL assinada",async()=>{
    const s=setup();const dish=await service.uploadDishImage(7,owner,jpeg,"image/jpeg",s.repo,s.storage);
    assert.match(s.getRecord().imageKey,/easyfood\/dishes\/restaurant-10\/dish-7\/.+\.jpg$/);assert.equal(s.getRecord().imageUrl,null);assert.match(dish.imageUrl,/^https:\/\/signed\.example/);
});
test("cliente não pode fazer upload",async()=>{const s=setup();await assert.rejects(service.uploadDishImage(7,client,jpeg,"image/jpeg",s.repo,s.storage),error=>error.status===403);});
test("restaurante não altera imagem de outro restaurante",async()=>{const s=setup();await assert.rejects(service.uploadDishImage(7,other,jpeg,"image/jpeg",s.repo,s.storage),error=>error.status===403);});
test("admin pode alterar qualquer imagem",async()=>{const s=setup();assert.equal((await service.uploadDishImage(7,admin,png,"image/png",s.repo,s.storage)).hasImage,true);});
test("prato inexistente retorna 404",async()=>{const s=setup();s.repo.findRecordById=async()=>null;await assert.rejects(service.uploadDishImage(999,admin,png,"image/png",s.repo,s.storage),error=>error.status===404);});
test("substituição envia nova, salva banco e remove antiga",async()=>{
    const old="easyfood/dishes/restaurant-10/dish-7/11111111-1111-4111-8111-111111111111.png",s=setup({imageKey:old});await service.uploadDishImage(7,owner,webp,"image/webp",s.repo,s.storage);
    assert.deepEqual(s.calls.map(call=>call[0]),["upload","database","remove"]);assert.equal(s.calls[2][1],old);
});
test("falha do S3 mantém imagem anterior e banco intacto",async()=>{const old="easyfood/dishes/restaurant-10/dish-7/11111111-1111-4111-8111-111111111111.png",s=setup({imageKey:old,failUpload:true});await assert.rejects(service.uploadDishImage(7,owner,jpeg,"image/jpeg",s.repo,s.storage),error=>error.status===502);assert.equal(s.getRecord().imageKey,old);assert.ok(!s.calls.some(call=>call[0]==="database"));});
test("storage não configurado retorna 503 sem alterar banco",async()=>{const s=setup({notConfigured:true});await assert.rejects(service.uploadDishImage(7,owner,jpeg,"image/jpeg",s.repo,s.storage),error=>error.status===503);assert.ok(!s.calls.some(call=>call[0]==="database"));});
test("falha do banco remove novo objeto para evitar órfão",async()=>{const s=setup({failDatabase:true});await assert.rejects(service.uploadDishImage(7,owner,jpeg,"image/jpeg",s.repo,s.storage));assert.deepEqual(s.calls.map(call=>call[0]),["upload","database","remove"]);});
test("remoção exclui objeto e limpa referência sem excluir prato",async()=>{const key="easyfood/dishes/restaurant-10/dish-7/11111111-1111-4111-8111-111111111111.png",s=setup({imageKey:key});const dish=await service.removeDishImage(7,owner,s.repo,s.storage);assert.equal(dish.hasImage,false);assert.equal(s.getRecord().imageKey,null);assert.deepEqual(s.calls.map(call=>call[0]),["remove","database"]);});
test("exclusão do prato remove imagem antes do registro",async()=>{const key="easyfood/dishes/restaurant-10/dish-7/11111111-1111-4111-8111-111111111111.png",s=setup({imageKey:key});await service.deleteDish(7,owner,s.repo,s.storage);assert.deepEqual(s.calls.map(call=>call[0]),["remove","dish-delete"]);});
test("chave gerada não usa nome original e contém UUID",()=>{const key=realStorage.buildDishKey({restaurantId:3,dishId:15,extension:"webp"});assert.match(key,/^easyfood\/dishes\/restaurant-3\/dish-15\/[0-9a-f-]{36}\.webp$/);assert.ok(!key.includes("pizza"));});
test("sem configuração AWS a leitura mantém placeholder sem falhar",async()=>{const originalRegion=process.env.AWS_S3_REGION,originalBucket=process.env.AWS_S3_BUCKET;delete process.env.AWS_S3_REGION;delete process.env.AWS_S3_BUCKET;assert.equal(await realStorage.getReadUrl("easyfood/dishes/restaurant-1/dish-1/00000000-0000-4000-8000-000000000000.jpg"),null);if(originalRegion)process.env.AWS_S3_REGION=originalRegion;if(originalBucket)process.env.AWS_S3_BUCKET=originalBucket;});
