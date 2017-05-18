jQuery(function ($) {

    var socket = io('http://localhost:8080');

    //On change le nom du profile dans la liste
    console.log('salut');
    $('#listProfil').change(function(){
        $('#NameProfil').val(this.value);
    });

    $('#NewProfil').click(function(el){
        console.log('click');
    });

});
