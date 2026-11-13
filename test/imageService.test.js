const test=require("node:test"),assert=require("node:assert/strict"),sharp=require("sharp"),images=require("../src/modules/images/imageService"),fs=require("node:fs");
async function sample(format="jpeg",width=100,height=80){let pipeline=sharp({create:{width,height,channels:3,background:"red"}});return pipeline[format]().toBuffer();}
for(const format of ["jpeg","png","webp"])test(`${format} é aceito`,async()=>assert.equal((await images.processImage(await sample(format),{preset:"dish"})).metadata.originalFormat,format));
for(const [name,buffer] of [["SVG",Buffer.from("<svg></svg>")],["HTML",Buffer.from("<html></html>")],["arbitrário",Buffer.from("exe")]])test(`${name} é rejeitado`,async()=>assert.rejects(()=>images.processImage(buffer,{preset:"dish"}),/inválida|Formato/));
test("converte para WebP",async()=>assert.equal((await sharp((await images.processImage(await sample(),{preset:"dish"})).buffer).metadata()).format,"webp"));
test("profile limita 512x512",async()=>{const r=await images.processImage(await sample("png",900,700),{preset:"profile"});assert.ok(r.metadata.width<=512&&r.metadata.height<=512);});
test("dish limita 1600px",async()=>{const r=await images.processImage(await sample("jpeg",1800,1000),{preset:"dish"});assert.ok(r.metadata.width<=1600&&r.metadata.height<=1600);});
test("imagem pequena não aumenta",async()=>{const r=await images.processImage(await sample("png",100,80),{preset:"dish"});assert.deepEqual([r.metadata.width,r.metadata.height],[100,80]);});
test("retorna metadata e tamanhos",async()=>{const input=await sample();const r=await images.processImage(input,{preset:"dish"});assert.equal(r.metadata.originalSize,input.length);assert.equal(r.metadata.processedSize,r.buffer.length);assert.equal(r.metadata.processedFormat,"webp");});
test("frontend de perfil usa FormData sem userId",()=>{const s=fs.readFileSync(require.resolve("../public/profile.js"),"utf8");assert.match(s,/new FormData/);assert.doesNotMatch(s,/userId/);});
test("frontend de prato usa FormData",()=>assert.match(fs.readFileSync(require.resolve("../public/dish-form.js"),"utf8"),/new FormData/));
test("User e Dish reutilizam ImageService",()=>{assert.match(fs.readFileSync(require.resolve("../src/modules/users/profileImageService.js"),"utf8"),/imageService/);assert.match(fs.readFileSync(require.resolve("../src/modules/dishes/dishController.js"),"utf8"),/imageService/);});
test("falha ao assinar foto não bloqueia apresentação do usuário",async()=>{
    const service=require("../src/modules/users/profileImageService");
    const user={id:7,name:"Usuário",profileImageKey:"easyfood/users/7/profile/foto.webp"};
    const result=await service.present(user,{getReadUrl:async()=>{throw new Error("S3 indisponível");}});
    assert.equal(result.profileImageUrl,null);
    assert.equal(result.hasProfileImage,true);
    assert.equal(result.profileImageKey,undefined);
    assert.equal(result.id,7);
});
