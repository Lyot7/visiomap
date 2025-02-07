import React from 'react';

interface CallInvitationModalProps {
    isModalOpen: boolean;
    onAccept: () => void;
    onDeny: () => void;
    callerName: string;
}

const CallInvitationModal: React.FC<CallInvitationModalProps> = ({ isModalOpen, onAccept, onDeny, callerName }) => {
    if (!isModalOpen) return null;

    return (
        <div className="modal absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[50vh] h-[50vh] bg-gray-800 text-white rounded-lg shadow-lg ">
            <div className="modal-content h-full w-full flex flex-col justify-center items-center">
                <h2 className="text-2xl font-bold mb-4">{callerName} essaie de vous joindre</h2>
                <div className="flex space-x-4">
                    <button className="bg-green-600 px-4 py-2 rounded" onClick={onAccept}>Accepter</button>
                    <button className="bg-red-500 px-4 py-2 rounded" onClick={onDeny}>Refuser</button>
                </div>
            </div>
        </div>
    );
};

export default CallInvitationModal;