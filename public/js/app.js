import { Application } from '@hotwired/stimulus';
import PdfGeneratorController from './controllers/pdf-generator_controller.js';

const application = Application.start();
application.register('pdf-generator', PdfGeneratorController);
