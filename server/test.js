const EventEmitter = require('events');

class MyEmitter extends EventEmitter {
  constructor(ae) {
    super(); //must call super for "this" to be defined.
    this.name = 'toto';
  }     

}

const myEmitter = new MyEmitter();
console.log(myEmitter.name)
myEmitter.on('event', () => {
  console.log('an event occurred!');
});
myEmitter.emit('event');