jQuery(function ($) {

    var socket = io('http://localhost:8080');
    var bbq = '';

    // chaque chargement
    socket.emit('getProfile');

    //On change le nom du profile dans la liste
    console.log('Nouveau profile');
    $('#listProfil').change(function(){
      console.log(this.value);
      console.log(bbq.profile);
        $('#NameProfil').val(this.value);
        $('#Format').val(bbq.profile[this.value].Format);
        $('#vCodec').val(this.value);
        $('#aCodec').val(this.value);
        $('#FrameRate').val(this.value);
        $('#WPP').val(this.value);
    });

    // On change les valeurs des paramètres en fonction du profil choisis
  //  console.log('Changement des paramètres')
  //  $('#listProfil').change(function())

    // On set VAL '' à l'ID NameProfil
    $('#NewProfil').click(function(el){
        console.log('click');
        $('#NameProfil').val('');
    });

    // On emit via Socket des objects, après click sur updateProfile
    $('#SaveProfil').click(function() {
        console.log('Requête de modification du profil')
        socket.emit('updateProfile', {
          name:$('#NameProfil').val(),
          Format:$('#Format').val(),
          vCodec:$('#vCodec').val(),
          aCodec:$('#aCodec').val(),
        });
    });

    // Mise à jour des profils
    socket.on('profile', function(profile) {
      console.log('Réception des profils');
      console.log(profile);
      bbq.profile = profile;
      var liste = '';
      for(var i in profile) {
      liste += '<option>'+i+'</option>';
      }

      $('#listProfil').html(liste);
    });

});

//deleteprofil name jquerry
