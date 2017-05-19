jQuery(function ($) {

    var socket = io('http://localhost:8080');
    var bbq = '';

    //On change le nom du profile dans la liste
    console.log('Nouveau profile');
    $('#listProfil').change(function(){
        $('#NameProfil').val(this.value);
    });


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
    console.log('Requête des profils existants')
    socket.emit('ListDesProfils', {
    }

    socket.on('profile', function(profile) {
        console.log('Réception des profils');
        

      if(request.type === 'all'){
        console.log('Get All Profile');
        fs.readFile((path.join(__dirname, '../common/bbq.profile')), (err, data) => {
          if(err){
            socket.emit('profile', {
              error: err
            });
          }
          else{
            socket.emit('profile', JSON.parse(data));
            console.log('All profile sent');
          }
        });
      }
      else{
        console.log('Get '+request.name+' Profile');
        fs.readFile((path.join(__dirname, '../common/bbq.profile')), (err, data) => {
          if(err){
            socket.emit('profile', {
              error: err
            });
          }
          else{
            socket.emit('profile', JSON.parse(data)[request.name]);
            console.log('All profile sent');
          }
        });
      }
    });

});
