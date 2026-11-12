process.env.EMAIL_REAL_TEST = "1";
require("dotenv").config({ quiet: true });
const MailerSendProvider = require("../src/modules/email/mailerSendProvider");
const emailService = require("../src/modules/email/emailService");
const recipient = process.env.MAIL_REAL_TEST_TO;
if (!recipient) { console.error("Defina MAIL_REAL_TEST_TO para executar o teste explícito."); process.exitCode = 1; }
else emailService.deliver({ type: "email.integration.test", entityType: "system", entityId: 1, recipient: { email: recipient, name: "Teste EasyFood" },
    subject: "Teste de integração EasyFood", content: emailService.template("Teste de integração", ["A integração com o MailerSend está funcionando."]) },
    new MailerSendProvider(), { recordBestEffort: async () => null }).then(result => { console.log(`Resultado: ${result.status}`); if (result.status !== "sent") process.exitCode = 1; });
