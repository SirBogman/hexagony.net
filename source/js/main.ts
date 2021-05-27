import { updateAppHelper } from './components/App';
import '../css/index.scss';
import { assertNotNull } from './view/ViewUtil';

updateAppHelper(assertNotNull(document.getElementById('app'), 'app'));
