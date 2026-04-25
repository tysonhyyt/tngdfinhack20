// import { Kafka } from 'kafkajs';

export class KafkaProducerService {
  // private kafka: Kafka;
  // private producer;

  constructor() {
    /* 
    this.kafka = new Kafka({
      clientId: 'backend-api-ingress',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
    });
    this.producer = this.kafka.producer();
    */
  }

  async connect() {
    // await this.producer.connect();
    console.log('[Kafka]: Producer connected (Simulated)');
  }

  async sendTransactionEvent(topic: string, message: any) {
    // await this.producer.send({ topic, messages: [{ value: JSON.stringify(message) }] });
    console.log(`[Kafka]: Event published to ${topic}`);
  }
}

export const kafkaProducer = new KafkaProducerService();
