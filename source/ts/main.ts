import { updateAppHelper } from './components/App';
import '../styles/index.scss';
import { assertNotNull } from './view/ViewUtil';

updateAppHelper(assertNotNull(document.getElementById('app'), 'app'));
