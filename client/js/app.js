jQuery(function ($) {

    var socket = io('http://localhost:8080');

    //On change le nom du profile dans la liste
    console.log('salut');
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
        socket.emit('updateProfile', {
          name:$('#NameProfil').val(),
          Format:$('#Format').val(),
          vCodec:$('#vCodec').val(),
          aCodec:$('#aCodec').val(),
        });
    });
});
