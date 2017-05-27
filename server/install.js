var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'BBQ_Codeur',
  description: 'The best HEVC encoder',
  script: 'C:\\Program Files\\BBQ_Codeur\\server\\index.js'
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
  console.log('QQB_Codeur was successfully installed');
});

svc.on('alreadyinstalled', function(){
    console.log('BBQ_Codeur service is already installed');
});

svc.on('invalidinstallation', function(){
    console.log('BBQ_Codeur service: "invalid installation"');
});

svc.on('error', function(e){
    console.log('BBQ_Codeur service ERROR: '+e);
});


svc.install();