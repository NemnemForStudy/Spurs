const { handleRequest } = require("../../server.js");

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default async function handler(request, response) {
  await handleRequest(request, response);
}
