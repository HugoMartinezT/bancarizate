module.exports = {
  validado: null,
  validarRut: function(rut) {
    let dv, array_rut, array_rut_reverse, multiplicador, suma, mod, dv_final, rut_verificado

    rut = rut.toLowerCase()
    dv = rut.split('-')[1]
    array_rut = rut.split('-')[0].split('')
    array_rut_reverse = array_rut.reverse()
    multiplicador = 2
    suma = 0

    multiplicado = array_rut_reverse.map(function(e){
      let resultado = e * multiplicador

      if(multiplicador == 7) {
        multiplicador = 2
      } else {
        multiplicador++
      }

      return resultado
    })

    multiplicado.map(function(e) {
      suma = e + suma
    })

    mod = suma % 11

    dv_final = 11 - mod
    
    switch (dv_final) {
      case 11:
        dv_final = 0
        break;
      case 10:
        dv_final = 'k'
        break;
    }

    array_rut.reverse()

    rut_verificado = array_rut.join('') + '-' + dv_final

    if(rut == rut_verificado) {
      this.validado = true
    } else {
      this.validado = false
    }
  }
}