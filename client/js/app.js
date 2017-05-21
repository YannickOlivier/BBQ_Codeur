var bbq = {};

jQuery(function ($) {

    var socket = io('http://localhost:8080');

    // chaque chargement
    socket.emit('getProfile');

    //On change le nom du profile dans la liste
    console.log('Nouveau profile');

    $('#listProfil').change(updateProfile);

    function updateProfile(){
        var profilName = $('#listProfil').val();
        $('#NameProfil').val(profilName);
        $('#Format').val(bbq.profile[profilName].Format);
        $('#vCodec').val(bbq.profile[profilName].vCodec);
        $('#aCodec').val(bbq.profile[profilName].aCodec);
        $('#FrameRate').val(bbq.profile[profilName].FrameRate);
        $('#WPP').val(bbq.profile[profilName].WPP);
    }

    function updateProfileNBR(){
      var nbr = 0;
      for(var i in bbq.profile)
        nbr++;
      $('#nbrProfile').html(''+nbr);
    }
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
          FrameRate:$('#FrameRate').val(),
          WPP:$('#WPP').val(),
        });
    });

    // Suppression d'un profil
    $('#DeleteProfil').click(function() {
        console.log('Requête de suppression du profil')
        socket.emit('deleteProfile', {
          name:$('#NameProfil').val()
        });
    });


    // Shutdown du serveur
        $('#Shutdown').click(function() {
            console.log('Shutdown du serveur')
            socket.emit('shutdown', {
            });
        });

        // Arrêt du serveur
        socket.on('shutdown', function(profile) {
          console.log('Shutdown coté serveur');
          confirm("Le serveur vient de s'arrêter")
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
      updateProfile();
      updateProfileNBR();
    });

    $(document).ready(function(){
    $('[data-toggle="popover"]').popover({
        placement : 'top'
    });

    socket.on('monitoring', function(monitoring){
      console.log(monitoring)
      for(var i in monitoring){
        var name = monitoring[i].name;
        var id = i;
        var percent = monitoring[i].percent;
        var status = monitoring[i].status;
        var template = ' <div class="flexbox"> \
                          <button id="close_'+id+'" type="button" class="close flexboxmargin" aria-label="Close"></button> \
                          <textfichier id="text'+id+'" class="flexboxsmall flexboxmargin" >'+name+'</textfichier> \
                          <div class="progress flexboxbig flexboxmargin flexboxprogress"> \
                              <div id="progress'+id+'" class="progress-bar progress-bar-striped active progress-bar-success flexboxprogress" role="progressbar" aria-valuenow="'+percent+'" aria-valuemin="0" aria-valuemax="100" style="width:'+percent+'%"></div> \
                          </div>\
                          <p id="status'+id+'" class="btn btn-sm btn-success flexboxmargin" data-toggle="popover" ">'+status+'</p> \
                          <button id="download'+id+'" type="button" class="btn btn-sm btndl flexboxmargin">Télécharger</button> \
                        </div>';
        $('#monitoring').empty();
        $(template).appendTo('#monitoring');
      }



    });


});

});


//deleteprofil name jquerry
