var bbq = '';
var profile = '';

jQuery(function ($) {

    var socket = io('http://localhost:8080');

    // chaque chargement
    socket.emit('getProfile');

    //On change le nom du profile dans la liste
    console.log('Nouveau profile');


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

    // Suppression d'un profil
    $('#DeleteProfil').click(function() {
        console.log('Requête de suppression du profil')
        socket.emit('DeleteProfil', {
          name:$('#NameProfil').val(),
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
          $('#listProfil').change(function(){
              console.log('Affichage des paramètres');
              $('#NameProfil').val(this.value);
              $('#Format').val(profile[this.value].Format);
              $('#vCodec').val(profile[this.value].vCodec);
              $('#aCodec').val(profile[this.value].aCodec);
              $('#FrameRate').val(profile[this.value].Format);
              $('#WPP').val(profile[this.value].Format);
          });
      }
      $('#listProfil').html(liste);
    });

});

//deleteprofil name jquerry
