const tf = require('@tensorflow/tfjs');
require('@tensorflow/tfjs-node');

const createModelLayers = function createModelLayers(inputLen) {
  const model = tf.sequential();

  model.add(tf.layers.dense({ inputShape: [ inputLen ], activation: 'sigmoid', units: 16 }));
  model.add(tf.layers.dense({ inputShape: [ 16 ], activation: 'sigmoid', units: 8 }));
  model.add(tf.layers.dense({ inputShape: [ 8 ], activation: 'sigmoid', units: 3 }));

  model.compile({
    loss: 'meanSquaredError',
    optimizer: tf
      .train
      .adam(0.06)
  });

  return model;
};


module.exports = {
  createModelLayers,
};
