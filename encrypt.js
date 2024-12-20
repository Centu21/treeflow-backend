const bcrypt = require('bcrypt');

const nuevaPassword = '141089'; // La nueva contraseña que quieres encriptar

bcrypt.hash(nuevaPassword, 10, (err, hash) => {
  if (err) {
    console.error('Error al encriptar la contraseña:', err);
  } else {
    console.log('Contraseña encriptada:', hash);
  }
});
