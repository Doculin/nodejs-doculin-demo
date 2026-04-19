require('dotenv').config();

module.exports = {
    port: Number(process.env.PORT) || 3001,
    doculinDomain: process.env.DOCULIN_DOMAIN || 'https://doculin.com',
    doculinApiKey: process.env.DOCULIN_API_KEY || '',
};
