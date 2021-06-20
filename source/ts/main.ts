import '../styles/index.scss';
import { updateAppHelper } from './components/App';
import { assertNotNull } from './view/ViewUtil';

updateAppHelper(assertNotNull(document.getElementById('app'), 'app'));
