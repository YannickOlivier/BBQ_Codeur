var bbq = {};

jQuery(function ($) {

    var socket = io('http://localhost:8080');
    // chaque chargement
    socket.emit('getProfile');
    socket.emit('getMonitoring');
    socket.emit('test', {
      test: 'start'
    });
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

    // Clear monitoring
    $('#clearMonitoring').click(function() {
        console.log('Suppression du monitoring');
        socket.emit('clearMonitoring', {
          clear: true
        });
    });


    // Shutdown du serveur
    $('#Shutdown').click(function() {
        console.log('Shutdown du serveur');
        socket.emit('test', {
          test: 'shutdown'
        });
        socket.emit('shutdown', {
          shutdown: true
        });
    });

    // Arrêt du serveur
    socket.on('shutdown', function(profile) {
      console.log('Shutdown coté serveur');
      confirm("Le serveur vient de s'arrêter");
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


    socket.on('monitoring', function(monitoring){
      bbq.monitoring = monitoring;
      $('#monitoring').empty();
      for(var i in monitoring){
        var name = monitoring[i].name;
        var id = i;
        var percent = monitoring[i].percent;
        var status = monitoring[i].status;
        var displayName = monitoring[i].displayName;
        var colored = '';
        switch(monitoring[i].status){
          case 'Transcode':
              colored = 'success';
            break;
          case 'Uploading':
              colored = 'warning';
            break;
          case 'ERROR':
              colored = 'danger';
            break;
          case 'DONE':
              colored = 'info';
            break;
          case 'STOP':
              colored = 'danger';
            break;
        }
        
          // Test si téléchargement possible
          var disabled_button = '';
          var href = 'href="download/';
            if (monitoring[1].status == ERROR || monitoring[1].satus == STOP) {
          disabled_button = 'disabled';
          } else {
          disabled_button = '';
         }

        // Template
        var template = ' <div class="flexbox"> \
                          <button id="'+id+'" type="button" class="close flexboxmargin" aria-label="Close">\
                          <span aria-hidden="true">&times;</span>\
                          </button> \
                          <textfichier id="text'+id+'" class="flexboxsmall flexboxmargin" >'+displayName+'</textfichier> \
                          <div class="progress flexboxbig flexboxmargin flexboxprogress"> \
                              <div id="progress'+id+'" class="progress-bar progress-bar-striped active progress-bar-'+colored+' flexboxprogress" role="progressbar" aria-valuenow="'+percent+'" aria-valuemin="0" aria-valuemax="100" style="width:'+percent+'%">'+percent+'%</div> \
                          </div>\
                          <p id="status'+id+'" class="btn btn-sm btn-'+colored+' flexboxmargin" data-toggle="popover" data-content="'+status+'">'+status+'</p> \
                          <a id="download'+id+'" class="btn btn-default btndl flexboxmargin" role="button" href="download/'+name+'" download '+disabled_button+'>Télécharger</a> \
                        </div>';
        $(template).appendTo('#monitoring');
      }

      $('.close').click(function(e){
        socket.emit('job', {
          type: 'delete',
          jobID: e.currentTarget.id
        });
      });

    });

});


//deleteprofil name jquerry
