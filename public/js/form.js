// form.js - handles both the report form and the claim form

document.addEventListener('DOMContentLoaded', () => {


  // REPORT FORM (report.html)

  const reportForm = document.getElementById('report-form');

  if (reportForm) {

    // photo preview
    const photoInput  = document.getElementById('item-photo');
    const previewWrap = document.getElementById('upload-preview');
    const previewImg  = document.getElementById('preview-img');
    const removeBtn   = document.getElementById('remove-photo');
    const uploadZone  = document.getElementById('upload-zone');

    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      if (!file) return;
      previewImg.src            = URL.createObjectURL(file);
      previewWrap.style.display = 'block';
    });

    removeBtn.addEventListener('click', () => {
      photoInput.value          = '';
      previewImg.src            = '';
      previewWrap.style.display = 'none';
    });

    // drag and drop
    uploadZone.addEventListener('dragover',  (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', ()  => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) {
        const dt = new DataTransfer();
        dt.items.add(file);
        photoInput.files = dt.files;
        photoInput.dispatchEvent(new Event('change'));
      }
    });

    // form submit
    reportForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideReportError();

      const title    = document.getElementById('item-title').value.trim();
      const category = document.getElementById('item-category').value;
      const desc     = document.getElementById('item-description').value.trim();
      const location = document.getElementById('item-location').value.trim();
      const date     = document.getElementById('item-date').value;

      if (!title || !category || !desc || !location || !date) {
        showReportError('Please fill in all required fields.');
        return;
      }

      // FormData so the photo gets sent as multipart
      const formData  = new FormData(reportForm);
      const submitBtn = document.getElementById('submit-btn');
      submitBtn.disabled    = true;
      submitBtn.textContent = 'Submitting...';

      try {
        const res  = await fetch('/api/items', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) {
          showReportError(data.error || 'Submission failed. Please try again.');
          return;
        }

        reportForm.hidden = true;
        const successEl   = document.getElementById('form-success');
        successEl.hidden  = false;
        successEl.focus();

      } catch (err) {
        showReportError('Network error. Make sure the server is running.');
      } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Submit Found Item';
      }
    });

    function showReportError(msg) {
      const el = document.getElementById('form-error');
      el.querySelector('p').textContent = msg;
      el.hidden = false;
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideReportError() {
      document.getElementById('form-error').hidden = true;
    }
  }


  // CLAIM FORM (claim.html)

  const claimForm = document.getElementById('claim-form');

  if (claimForm) {

    const stepItem   = document.getElementById('step-item');
    const stepVerify = document.getElementById('step-verify');
    const stepInfo   = document.getElementById('step-info');
    const stepDots   = document.querySelectorAll('.step');

    const continueToVerify = document.getElementById('continue-to-verify');
    const backToItem       = document.getElementById('back-to-item');
    const continueToInfo   = document.getElementById('continue-to-info');
    const backToVerify     = document.getElementById('back-to-verify');

    const itemSelect  = document.getElementById('item-select');
    const itemPreview = document.getElementById('item-preview');

    const verifyLoading = document.getElementById('verify-loading');
    const verifyWrap    = document.getElementById('verify-question-wrap');
    const verifyText    = document.getElementById('verify-question-text');

    // store the generated question so we can include it in the claim POST
    let currentQuestion = '';

    // pre-fill item select from URL param (?id=3)
    const urlId = new URLSearchParams(window.location.search).get('id');
    if (urlId) {
      itemSelect.value = urlId;
      itemSelect.dispatchEvent(new Event('change'));
    }

    loadItemsIntoSelect();

    async function loadItemsIntoSelect() {
      try {
        const res   = await fetch('/api/items');
        const items = await res.json();

        itemSelect.innerHTML = '<option value="">Choose an item</option>';
        items.forEach(item => {
          if (item.status === 'claimed') return; // skip already claimed
          const opt       = document.createElement('option');
          opt.value       = item.id;
          opt.textContent = `${item.title} (found ${formatDate(item.date_found)})`;
          itemSelect.appendChild(opt);
        });

        // re-apply URL param after options load
        if (urlId) {
          itemSelect.value = urlId;
          itemSelect.dispatchEvent(new Event('change'));
        }
      } catch (err) {
        console.warn('Could not load items into claim select:', err.message);
      }
    }

    // show item preview when selection changes
    itemSelect.addEventListener('change', async () => {
      const id = itemSelect.value;
      if (!id) { itemPreview.hidden = true; return; }

      try {
        const res  = await fetch(`/api/items/${id}`);
        if (!res.ok) { itemPreview.hidden = true; return; }
        const item = await res.json();

        document.getElementById('preview-title').textContent    = item.title;
        document.getElementById('preview-desc').textContent     = item.description;
        document.getElementById('preview-category').textContent = item.category;
        document.getElementById('preview-date').textContent     = `Found ${formatDate(item.date_found)}`;
        itemPreview.hidden = false;
      } catch (_) {
        itemPreview.hidden = true;
      }
    });

    // step 1 to step 2
    continueToVerify.addEventListener('click', async () => {
      if (!itemSelect.value) {
        alert('Please select an item first.');
        return;
      }
      showStep(stepVerify, 1);
      await loadVerificationQuestion(itemSelect.value);
    });

    backToItem.addEventListener('click',   () => showStep(stepItem, 0));
    backToVerify.addEventListener('click', () => showStep(stepVerify, 1));

    // step 2 to step 3
    continueToInfo.addEventListener('click', () => {
      if (!document.getElementById('verify-answer').value.trim()) {
        alert('Please answer the verification question.');
        return;
      }
      showStep(stepInfo, 2);
    });

    // final submit
    claimForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name  = document.getElementById('claimant-name').value.trim();
      const email = document.getElementById('claimant-email').value.trim();

      if (!name || !email) {
        showClaimError('Please enter your name and email.');
        return;
      }

      const submitBtn       = document.getElementById('claim-submit');
      submitBtn.disabled    = true;
      submitBtn.textContent = 'Submitting...';

      try {
        const res = await fetch('/api/claims', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            item_id:               itemSelect.value,
            claimant_name:         name,
            claimant_email:        email,
            extra_notes:           document.getElementById('extra-notes').value.trim(),
            verification_question: currentQuestion,
            verification_answer:   document.getElementById('verify-answer').value.trim(),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          showClaimError(data.error || 'Submission failed. Please try again.');
          return;
        }

        claimForm.hidden = true;
        const successEl  = document.getElementById('claim-success');
        successEl.hidden = false;
        successEl.focus();

      } catch (err) {
        showClaimError('Network error. Make sure the server is running.');
      } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Submit Claim';
      }
    });


    // calls the backend which calls n8n (or falls back to a canned question)
    async function loadVerificationQuestion(itemId) {
      verifyLoading.hidden = false;
      verifyWrap.hidden    = true;

      try {
        const res  = await fetch('/api/claims/question', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ item_id: itemId }),
        });

        const data = await res.json();
        currentQuestion        = data.question || 'Describe a unique feature of this item.';
        verifyText.textContent = currentQuestion;
      } catch (_) {
        currentQuestion        = 'Describe a unique identifying feature of this item.';
        verifyText.textContent = currentQuestion;
      } finally {
        verifyLoading.hidden = true;
        verifyWrap.hidden    = false;
      }
    }

    function showStep(panel, index) {
      [stepItem, stepVerify, stepInfo].forEach(p => (p.hidden = true));
      panel.hidden = false;

      stepDots.forEach((dot, i) => {
        dot.classList.remove('active', 'done');
        if (i < index)   dot.classList.add('done');
        if (i === index) dot.classList.add('active');
      });

      document.querySelectorAll('.step-line').forEach((line, i) => {
        line.classList.toggle('done', i < index);
      });
    }

    function showClaimError(msg) {
      const el = document.getElementById('claim-error');
      el.querySelector('p').textContent = msg;
      el.hidden = false;
    }

    function formatDate(dateStr) {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

});


// shared date formatter (also used by listings.js)
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}