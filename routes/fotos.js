function fotoGestionada(foto) {
    return typeof foto === 'string' &&
        /^[a-f0-9]{32}\.(jpg|png|webp)$/.test(foto);
}

function urlFoto(foto) {
    return fotoGestionada(foto)
        ? `/avatars/${encodeURIComponent(foto)}`
        : null;
}

module.exports = {
    fotoGestionada,
    urlFoto
};
