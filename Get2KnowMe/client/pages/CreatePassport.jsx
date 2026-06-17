import React, { useState, useEffect, useRef } from "react";
import {
  Form,
  Button,
  Container,
  Row,
  Col,
  Alert,
  Card,
  ProgressBar,
} from "react-bootstrap";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from "react-router-dom";
import { parsePhoneNumber } from 'libphonenumber-js';
import auth from "../utils/auth.js";
import QRCodeGenerator from "../components/QRCodeGenerator.jsx";
import PhoneNumberInput from "../components/PhoneNumberInput.jsx";
import { validatePhoneNumber } from '../utils/phoneUtils.js';
import "../styles/CreatePassport.css";
import "../styles/PhoneNumberInput.css";

const STEPS = [
  { number: 1, label: "The Essentials" },
  { number: 2, label: "About You" },
  { number: 3, label: "Trusted Contact" },
];

const DRAFT_KEY = "passport_draft";

const CreatePassport = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    preferredName: "",
    preferredPronouns: "",
    customPronouns: "",
    diagnoses: [],
    customDiagnosis: "",
    healthAlert: [],
    customHealthAlert: "",
    allergyList: "",
    communicationPreferences: [],
    customPreferences: "",
    triggers: "",
    likes: "",
    dislikes: "",
    trustedContact: {
      name: "",
      phone: "",
      countryCode: "GB",
      email: "",
    },
    profilePasscode: "",
    otherInformation: "",
    profilePhoto: "",
    communicationMethod: "",
    avoidWords: "",
    medications: "",
    calmingStrategies: "",
    distressSigns: "",
    sensoryNeeds: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const alertRef = useRef(null);

  const resizeImage = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 300;
        const ratio = Math.min(max / img.width, max / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image could not be loaded. Try a JPG or PNG file.'));
      };
      img.src = url;
    });

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5MB");
      return;
    }
    try {
      const resized = await resizeImage(file);
      setFormData(prev => ({ ...prev, profilePhoto: resized }));
    } catch {
      setError("Failed to process photo. Please try a different image.");
    }
  };

  const diagnosisOptions = [
    "Autism Spectrum Disorder (ASD)",
    "Attention Deficit Hyperactivity Disorder (ADHD)",
    "Obsessive-Compulsive Disorder (OCD)",
    "Dyslexia",
    "Dyscalculia",
    "Tourette's Syndrome",
    "C-PTSD (Complex PTSD)",
    "Anxiety",
    "Pathological Demand Avoidance (PDA)",
    "Cerebral Palsy",
    "Down Syndrome",
    "Acquired Brain Injury",
    "No Diagnosis",
    "Other",
  ];

  const healthAlertOptions = [
    "None",
    "Type 1 Diabetes",
    "Type 2 Diabetes",
    "Epilepsy",
    "Allergies",
    "Other",
  ];

  const preferenceOptions = [
    "I will understand things better if you speak slowly",
    "I may need extra time to process when you are speaking to me, it may take me a moment to respond",
    "Please avoid complicated questions or confusing language",
    "I do not enjoy physical contact, please do not touch me",
    "Please use gestures and non-verbal cues if possible, they help me understand better",
    "Reading can take me some time, please be patient and allow me time to process the information",
    "Other",
  ];

  useEffect(() => {
    if (!auth.loggedIn()) {
      navigate("/login");
      return;
    }
    loadExistingPassport();

    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) setHasDraft(true);
  }, [navigate]);

  const loadExistingPassport = async () => {
    try {
      const token = auth.getToken();
      const response = await fetch("/api/passport/my-passport", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const passportData = {
          ...data.passport,
          profilePhoto: data.profilePhoto || "",
          communicationMethod: data.passport.communicationMethod || "",
          avoidWords: data.passport.avoidWords || "",
          medications: data.passport.medications || "",
          calmingStrategies: data.passport.calmingStrategies || "",
          distressSigns: data.passport.distressSigns || "",
          sensoryNeeds: data.passport.sensoryNeeds || "",
          trustedContact: {
            ...data.passport.trustedContact,
            countryCode: data.passport.trustedContact?.countryCode || "GB",
          },
        };
        setFormData(passportData);
        setIsEditing(true);
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
      }
    } catch (err) {
      console.error("Error loading existing passport:", err);
    }
  };

  const saveDraft = () => {
    // Exclude profilePhoto from draft (too large for localStorage)
    const { profilePhoto, ...draftData } = formData;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    setHasDraft(true);
    setSuccess("Draft saved! You can continue later.");
    setTimeout(() => setSuccess(""), 3000);
  };

  const loadDraft = () => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      setFormData(JSON.parse(draft));
      setHasDraft(false);
      localStorage.removeItem(DRAFT_KEY);
    }
  };

  const generatePasscode = async () => {
    try {
      const response = await fetch("/api/passport/generate-passcode");
      const data = await response.json();
      if (response.ok) {
        setFormData((prev) => ({ ...prev, profilePasscode: data.passcode }));
      }
    } catch (err) {
      setError("Failed to generate passcode");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "preferredPronouns") {
      setFormData((prev) => ({
        ...prev,
        preferredPronouns: value,
        customPronouns: value === "Other" ? prev.customPronouns : "",
      }));
      return;
    }
    if (name.startsWith("trustedContact.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        trustedContact: { ...prev.trustedContact, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePreferenceChange = (preference) => {
    setFormData((prev) => ({
      ...prev,
      communicationPreferences: prev.communicationPreferences.includes(preference)
        ? prev.communicationPreferences.filter((p) => p !== preference)
        : [...prev.communicationPreferences, preference],
    }));
  };

  const handleDiagnosisChange = (diagnosis) => {
    setFormData((prev) => {
      if (diagnosis === "No Diagnosis") {
        return {
          ...prev,
          diagnoses: prev.diagnoses.includes("No Diagnosis") ? [] : ["No Diagnosis"],
        };
      }
      if (prev.diagnoses.includes("No Diagnosis")) return prev;
      return {
        ...prev,
        diagnoses: prev.diagnoses.includes(diagnosis)
          ? prev.diagnoses.filter((d) => d !== diagnosis)
          : [...prev.diagnoses, diagnosis],
      };
    });
  };

  const handlePhoneChange = (phoneValue) => {
    setFormData((prev) => ({
      ...prev,
      trustedContact: { ...prev.trustedContact, phone: phoneValue || "" },
    }));
  };

  const handleCountryChange = (countryCode) => {
    if (!countryCode && formData.trustedContact.phone) {
      try {
        const parsed = parsePhoneNumber(formData.trustedContact.phone);
        countryCode = parsed?.country || "GB";
      } catch {
        countryCode = "GB";
      }
    }
    if (!countryCode || typeof countryCode !== "string") countryCode = "GB";
    setFormData((prev) => ({
      ...prev,
      trustedContact: {
        ...prev.trustedContact,
        countryCode: countryCode.toUpperCase(),
      },
    }));
  };

  const validateStep = (stepNumber) => {
    setError("");
    if (stepNumber === 1) {
      if (!formData.firstName.trim()) { setError("First name is required"); return false; }
      if (!formData.lastName.trim()) { setError("Last name is required"); return false; }
      if (!formData.diagnoses || formData.diagnoses.length === 0) { setError("Please select at least one diagnosis"); return false; }
      if (formData.diagnoses.includes("Other") && !formData.customDiagnosis.trim()) { setError("Please specify your diagnosis"); return false; }
    }
    if (stepNumber === 3) {
      if (!formData.trustedContact.name.trim()) { setError("Trusted contact name is required"); return false; }
      const country = formData.trustedContact.countryCode || undefined;
      if (!formData.trustedContact.phone) { setError("Trusted contact phone number is required"); return false; }
      if (!validatePhoneNumber(formData.trustedContact.phone, country)) { setError("Please enter a valid phone number"); return false; }
      if (!formData.profilePasscode.trim()) { setError("Profile passcode is required"); return false; }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep((s) => s + 1);
    else if (alertRef.current) alertRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const prevStep = () => {
    setError("");
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(3)) {
      if (alertRef.current) alertRef.current.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setIsLoading(true);
    const submissionData = { ...formData };
    if (!submissionData.preferredPronouns) delete submissionData.preferredPronouns;

    try {
      const response = await auth.authenticatedFetch("/api/passport/create", {
        method: "POST",
        body: JSON.stringify(submissionData),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.removeItem(DRAFT_KEY);
        setHasDraft(false);
        setSuccess(`Communication Passport ${isEditing ? "updated" : "created"} successfully!`);
        setIsEditing(true);
        setTimeout(() => alertRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } else {
        setError(data.message || "Failed to save Communication Passport");
        setTimeout(() => alertRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (err) {
      setError("Server error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const progress = ((step - 1) / STEPS.length) * 100;

  return (
    <Container className="create-passport-container py-5">
      <Row className="justify-content-center">
        <Col lg={8} xl={6}>
          <Card className="passport-card">
            <Card.Body className="p-4">
              <div ref={alertRef}></div>

              <h2 className="passport-title text-center mb-2">
                {isEditing ? "Update" : "Create"} Your Communication Passport
              </h2>
              <p className="text-muted text-center mb-4">
                This information helps others understand how to communicate with you effectively.
              </p>

              {/* Draft banner */}
              {hasDraft && !isEditing && (
                <Alert variant="info" className="d-flex justify-content-between align-items-center">
                  <span>You have a saved draft.</span>
                  <Button size="sm" variant="outline-primary" onClick={loadDraft}>Resume Draft</Button>
                </Alert>
              )}

              {/* Progress bar */}
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-1">
                  {STEPS.map((s) => (
                    <small
                      key={s.number}
                      className={`fw-semibold ${step >= s.number ? "text-primary" : "text-muted"}`}
                    >
                      {s.number}. {s.label}
                    </small>
                  ))}
                </div>
                <ProgressBar now={progress + (100 / STEPS.length)} style={{ height: "8px" }} />
              </div>

              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleSubmit}>

                {/* ── STEP 1: The Essentials ── */}
                {step === 1 && (
                  <>
                    <p className="text-muted small mb-3">Fields marked <span className="text-danger">*</span> are required.</p>

                    <div className="form-section mb-3">
                      <Row>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>First Name <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="text"
                              name="firstName"
                              value={formData.firstName}
                              onChange={handleInputChange}
                              placeholder="Enter your first name"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Last Name <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="text"
                              name="lastName"
                              value={formData.lastName}
                              onChange={handleInputChange}
                              placeholder="Enter your last name"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Profile Photo <span className="text-muted small">(optional)</span></Form.Label>
                        <Form.Text className="text-muted d-block mb-2">
                          A photo helps people identify you quickly. It will be resized to a small thumbnail.
                        </Form.Text>
                        <div className="d-flex align-items-center gap-3">
                          {formData.profilePhoto && (
                            <img
                              src={formData.profilePhoto}
                              alt="Preview"
                              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-color)' }}
                            />
                          )}
                          <div>
                            <Form.Control
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoChange}
                              style={{ maxWidth: 280 }}
                            />
                            {formData.profilePhoto && (
                              <Button
                                variant="link"
                                size="sm"
                                className="text-danger p-0 mt-1"
                                onClick={() => setFormData(prev => ({ ...prev, profilePhoto: "" }))}
                              >
                                Remove photo
                              </Button>
                            )}
                          </div>
                        </div>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Diagnoses <span className="text-danger">*</span></Form.Label>
                        <Form.Text className="text-muted d-block mb-2">
                          Select all that apply. Choosing "No Diagnosis" will deselect others.
                        </Form.Text>
                        <div className="preferences-container">
                          {diagnosisOptions.map((option) => {
                            const noDiagnosisSelected = formData.diagnoses.includes("No Diagnosis");
                            const isDisabled = option !== "No Diagnosis" && noDiagnosisSelected;
                            return (
                              <div key={option} className="mb-2">
                                <Form.Check
                                  type="checkbox"
                                  id={`diagnosis-${option}`}
                                  label={option}
                                  checked={formData.diagnoses.includes(option)}
                                  onChange={() => handleDiagnosisChange(option)}
                                  disabled={isDisabled}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </Form.Group>
                    </div>

                    {formData.diagnoses.includes("Other") && (
                      <div className="form-section mb-3">
                        <Form.Group>
                          <Form.Label>Please specify your diagnosis <span className="text-danger">*</span></Form.Label>
                          <Form.Control
                            type="text"
                            name="customDiagnosis"
                            value={formData.customDiagnosis}
                            onChange={handleInputChange}
                            placeholder="Enter your specific diagnosis"
                          />
                        </Form.Group>
                      </div>
                    )}
                  </>
                )}

                {/* ── STEP 2: About You ── */}
                {step === 2 && (
                  <>
                    <p className="text-muted small mb-3">All fields on this step are optional — add as much or as little as you like.</p>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Preferred Name <span className="text-muted small">(optional)</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="preferredName"
                          value={formData.preferredName}
                          onChange={handleInputChange}
                          placeholder="What would you like to be called? (e.g., nickname, chosen name)"
                        />
                        <Form.Text className="text-muted">If provided, this is how others should address you</Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Preferred Pronouns <span className="text-muted small">(optional)</span></Form.Label>
                        <Form.Select
                          name="preferredPronouns"
                          value={formData.preferredPronouns}
                          onChange={handleInputChange}
                        >
                          <option value="">No Preference</option>
                          <option value="He/Him">He/Him</option>
                          <option value="She/Her">She/Her</option>
                          <option value="They/Them">They/Them</option>
                          <option value="Other">Other</option>
                        </Form.Select>
                      </Form.Group>
                      {formData.preferredPronouns === "Other" && (
                        <Form.Group className="mt-3">
                          <Form.Label>Custom Pronouns</Form.Label>
                          <Form.Control
                            type="text"
                            name="customPronouns"
                            value={formData.customPronouns}
                            onChange={handleInputChange}
                            placeholder="Enter your custom pronouns"
                          />
                        </Form.Group>
                      )}
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Communication Preferences <span className="text-muted small">(optional)</span></Form.Label>
                        <Form.Text className="text-muted d-block mb-2">
                          Select anything that helps others communicate with you better.
                        </Form.Text>
                        <div className="preferences-container">
                          {preferenceOptions.map((preference) => (
                            <div key={preference} className="mb-2">
                              <Form.Check
                                type="checkbox"
                                id={`pref-${preference}`}
                                label={preference}
                                checked={formData.communicationPreferences.includes(preference)}
                                onChange={() => handlePreferenceChange(preference)}
                              />
                            </div>
                          ))}
                        </div>
                      </Form.Group>
                      {formData.communicationPreferences.includes("Other") && (
                        <Form.Group className="mt-3">
                          <Form.Label>Additional Communication Preferences</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            name="customPreferences"
                            value={formData.customPreferences}
                            onChange={handleInputChange}
                            placeholder="Describe any other communication accommodations you need..."
                          />
                        </Form.Group>
                      )}
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>How I Communicate <span className="text-muted small">(optional)</span></Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="communicationMethod"
                          value={formData.communicationMethod}
                          onChange={handleInputChange}
                          placeholder="e.g. I speak verbally but need extra time. I use an AAC device. I communicate using sign language (BSL). I prefer written communication..."
                        />
                        <Form.Text className="text-muted">Describe your primary way of communicating — this is the first thing others should know.</Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Words / Phrases / Topics to Avoid <span className="text-muted small">(optional)</span></Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="avoidWords"
                          value={formData.avoidWords}
                          onChange={handleInputChange}
                          placeholder="Words, phrases, or topics that upset or confuse you..."
                        />
                        <Form.Text className="text-muted">Helps others communicate in a way that feels safe and clear for you.</Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Triggers <span className="text-muted small">(optional)</span></Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="triggers"
                          value={formData.triggers}
                          onChange={handleInputChange}
                          placeholder="Situations or things that may cause distress or discomfort..."
                        />
                        <Form.Text className="text-muted">Helps others avoid situations that may be difficult for you.</Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Signs I Am Struggling <span className="text-muted small">(optional)</span></Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="distressSigns"
                          value={formData.distressSigns}
                          onChange={handleInputChange}
                          placeholder="How others can tell when you are anxious, overwhelmed, or in distress..."
                        />
                        <Form.Text className="text-muted">Helps others recognise when you need support, even if you can't say so.</Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>What Helps Me Calm Down <span className="text-muted small">(optional)</span></Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="calmingStrategies"
                          value={formData.calmingStrategies}
                          onChange={handleInputChange}
                          placeholder="e.g. Give me quiet space, use a calm voice, let me use my fidget, avoid physical contact..."
                        />
                        <Form.Text className="text-muted">What others can do — or stop doing — when you are overwhelmed.</Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Sensory Needs <span className="text-muted small">(optional)</span></Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          name="sensoryNeeds"
                          value={formData.sensoryNeeds}
                          onChange={handleInputChange}
                          placeholder="e.g. Sensitive to loud noises. Bright lights are overwhelming. I dislike strong smells. I need movement breaks..."
                        />
                        <Form.Text className="text-muted">Sensitivities to noise, light, touch, smell, crowds, or the environment.</Form.Text>
                      </Form.Group>
                    </div>

                    <div className="form-section mb-3">
                      <Row>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Likes <span className="text-muted small">(optional)</span></Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="likes"
                              value={formData.likes}
                              onChange={handleInputChange}
                              placeholder="Things you enjoy, topics you like..."
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label>Dislikes <span className="text-muted small">(optional)</span></Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              name="dislikes"
                              value={formData.dislikes}
                              onChange={handleInputChange}
                              placeholder="Things to avoid, topics that make you uncomfortable..."
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>

                    <div className="form-section mb-3">
                      <Form.Group>
                        <Form.Label>Additional Information <span className="text-muted small">(optional)</span></Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          name="otherInformation"
                          value={formData.otherInformation}
                          onChange={handleInputChange}
                          placeholder="Anything else important you'd like others to know..."
                          maxLength={1000}
                        />
                        <Form.Text className="text-muted">
                          {(formData.otherInformation || "").length}/1000 characters
                        </Form.Text>
                      </Form.Group>
                    </div>
                  </>
                )}

                {/* ── STEP 3: Trusted Contact & Passcode ── */}
                {step === 3 && (
                  <>
                    <p className="text-muted small mb-3">Fields marked <span className="text-danger">*</span> are required.</p>

                    <div className="form-section mb-4">
                      <h5 className="mb-1">Trusted Contact</h5>
                      <p className="small text-muted mb-3">
                        This person will be shown on your passport as someone who can help in an emergency. <strong>Please let them know before adding them.</strong>
                      </p>

                      <Form.Group className="mb-3">
                        <Form.Label>Contact Name <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          name="trustedContact.name"
                          value={formData.trustedContact.name}
                          onChange={handleInputChange}
                          placeholder="Enter trusted contact's full name"
                        />
                      </Form.Group>

                      <PhoneNumberInput
                        value={formData.trustedContact.phone}
                        onChange={handlePhoneChange}
                        label={<>Phone Number <span className="text-danger">*</span></>}
                        placeholder="Enter phone number"
                        required
                        country={formData.trustedContact.countryCode}
                        onCountryChange={handleCountryChange}
                      />

                      <Form.Group className="mb-3">
                        <Form.Label>Email Address <span className="text-muted small">(optional)</span></Form.Label>
                        <Form.Control
                          type="email"
                          name="trustedContact.email"
                          value={formData.trustedContact.email}
                          onChange={handleInputChange}
                          placeholder="Enter email address"
                        />
                      </Form.Group>
                    </div>

                    <div className="form-section mb-4">
                      <h5 className="mb-1">Health Alerts <span className="text-muted small fw-normal">(optional)</span></h5>
                      <p className="small text-muted mb-3">Select any conditions you want emergency responders or carers to be aware of.</p>
                      <div className="preferences-container">
                        {healthAlertOptions.map((option) => (
                          <div key={option} className="mb-2">
                            <Form.Check
                              type="checkbox"
                              id={`healthAlert-${option}`}
                              label={option}
                              checked={formData.healthAlert.includes(option)}
                              onChange={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  healthAlert: prev.healthAlert.includes(option)
                                    ? prev.healthAlert.filter((a) => a !== option)
                                    : [...prev.healthAlert, option],
                                }));
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      {formData.healthAlert.includes("Allergies") && (
                        <Form.Group className="mt-2">
                          <Form.Label>Please list your allergies</Form.Label>
                          <Form.Control
                            type="text"
                            name="allergyList"
                            value={formData.allergyList || ""}
                            onChange={handleInputChange}
                            placeholder="List your allergies here"
                          />
                        </Form.Group>
                      )}
                      {formData.healthAlert.includes("Other") && (
                        <Form.Group className="mt-2">
                          <Form.Label>Please specify your health alert</Form.Label>
                          <Form.Control
                            type="text"
                            name="customHealthAlert"
                            value={formData.customHealthAlert || ""}
                            onChange={handleInputChange}
                            placeholder="Enter your specific health alert"
                          />
                        </Form.Group>
                      )}
                    </div>

                    <div className="form-section mb-4">
                      <h5 className="mb-1">Medications <span className="text-muted small fw-normal">(optional)</span></h5>
                      <p className="small text-muted mb-3">Note any current medications or important medical information for carers and emergency responders.</p>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="medications"
                        value={formData.medications || ""}
                        onChange={handleInputChange}
                        placeholder="e.g. Takes Ritalin 10mg twice daily. Carries an EpiPen for bee stings..."
                      />
                    </div>

                    <div className="form-section mb-4">
                      <h5 className="mb-1">Your Passport Code <span className="text-danger">*</span></h5>
                      <p className="small text-muted mb-3">
                        This is how others find your passport — like a PIN for your profile. You share it via QR code or by typing it in directly. <strong>Choose something memorable, or generate one automatically.</strong>
                      </p>
                      <Form.Group>
                        <div className="d-flex gap-2">
                          <Form.Control
                            type="text"
                            name="profilePasscode"
                            value={formData.profilePasscode}
                            onChange={handleInputChange}
                            placeholder="e.g. MyName123"
                            className="text-uppercase"
                          />
                          <Button
                            type="button"
                            className="btn-secondary passcode-generate-btn"
                            onClick={generatePasscode}
                          >
                            Generate
                          </Button>
                        </div>
                        <Form.Text className="text-muted">
                          6–20 letters and numbers only. Others need this code to view your passport.
                        </Form.Text>
                      </Form.Group>
                    </div>
                  </>
                )}

                {/* Navigation buttons */}
                <div className="d-flex justify-content-between align-items-center mt-4 flex-wrap gap-2">
                  <div className="d-flex gap-2">
                    {step > 1 && (
                      <Button variant="outline-secondary" onClick={prevStep}>
                        ← Back
                      </Button>
                    )}
                    {!isEditing && (
                      <Button variant="outline-secondary" onClick={saveDraft}>
                        Save Draft
                      </Button>
                    )}
                  </div>

                  {step < STEPS.length ? (
                    <Button className="passport-submit-btn" onClick={nextStep}>
                      Next →
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="passport-submit-btn"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? isEditing ? "Updating..." : "Creating..."
                        : isEditing ? "Update Passport" : "Create Passport"}
                    </Button>
                  )}
                </div>
              </Form>

              {/* Post-save actions */}
              {isEditing && success && (
                <div className="d-flex gap-2 justify-content-center flex-wrap mt-3">
                  <Button
                    className="btn-secondary"
                    onClick={() => navigate(`/passport/view/${formData.profilePasscode}`)}
                  >
                    View My Passport
                  </Button>
                  <Button
                    className="btn-secondary-reverse"
                    onClick={() => setShowQRModal(true)}
                  >
                    <FontAwesomeIcon icon="qrcode" className="me-1" />
                    Get QR Code
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>

          {isEditing && (
            <QRCodeGenerator
              show={showQRModal}
              onHide={() => setShowQRModal(false)}
              passcode={formData.profilePasscode}
              passportName={formData.preferredName || formData.firstName}
            />
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default CreatePassport;
