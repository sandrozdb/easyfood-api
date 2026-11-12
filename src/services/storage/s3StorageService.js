const { randomUUID } = require("node:crypto");
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const KEY_PATTERN = /^(?:easyfood\/dishes\/restaurant-\d+\/dish-\d+\/[0-9a-f-]{36}\.(?:jpg|png|webp)|easyfood\/users\/\d+\/profile\/[0-9a-f-]{36}\.webp)$/;
const SIGNED_URL_SECONDS = 900;

class StorageNotConfiguredError extends Error {
    constructor() { super("Storage S3 não configurado."); this.name = "StorageNotConfiguredError"; }
}

function config() {
    const region = String(process.env.AWS_S3_REGION || "").trim();
    const bucket = String(process.env.AWS_S3_BUCKET || "").trim();
    return { region, bucket, configured: Boolean(region && bucket) };
}

let cachedClient;
let cachedRegion;
function client() {
    const current = config();
    if (!current.configured) throw new StorageNotConfiguredError();
    if (!cachedClient || cachedRegion !== current.region) { cachedClient = new S3Client({ region: current.region }); cachedRegion = current.region; }
    return { s3: cachedClient, bucket: current.bucket };
}

function buildDishKey({ restaurantId, dishId, extension }) {
    if (!Number.isSafeInteger(restaurantId) || restaurantId < 1 || !Number.isSafeInteger(dishId) || dishId < 1 || !["jpg", "png", "webp"].includes(extension)) throw new Error("Parâmetros inválidos para a chave da imagem.");
    return `easyfood/dishes/restaurant-${restaurantId}/dish-${dishId}/${randomUUID()}.${extension}`;
}
function buildProfileKey({userId}){if(!Number.isSafeInteger(userId)||userId<1)throw new Error("Usuário inválido.");return `easyfood/users/${userId}/profile/${randomUUID()}.webp`;}

function assertManagedKey(key) {
    if (typeof key !== "string" || !KEY_PATTERN.test(key)) throw new Error("Chave de imagem inválida.");
}

async function upload({ key, body, contentType }) {
    assertManagedKey(key);
    const { s3, bucket } = client();
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: "private, max-age=900" }));
}

async function remove(key) {
    assertManagedKey(key);
    const { s3, bucket } = client();
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function getReadUrl(key) {
    if (!key || !config().configured) return null;
    assertManagedKey(key);
    const { s3, bucket } = client();
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: SIGNED_URL_SECONDS });
}

module.exports = { StorageNotConfiguredError, SIGNED_URL_SECONDS, config, buildDishKey, buildProfileKey, upload, remove, getReadUrl };
